use anyhow::{bail, Context, Result};
use serde_json::Value;
use std::{
    io::{BufRead, BufReader, Read, Write},
    net::{Ipv4Addr, SocketAddr, SocketAddrV4, TcpStream},
    time::Duration,
};

pub fn request(port: u16, method: &str, route: &str, body: Option<&Value>) -> Result<Value> {
    request_with_timeout(port, method, route, body, Duration::from_millis(200))
}

pub fn request_with_timeout(port: u16, method: &str, route: &str, body: Option<&Value>, timeout: Duration) -> Result<Value> {
    let address = SocketAddr::V4(SocketAddrV4::new(Ipv4Addr::LOCALHOST, port));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_millis(120))?;
    stream.set_read_timeout(Some(timeout))?;
    stream.set_write_timeout(Some(timeout))?;
    let body = body
        .map(serde_json::to_vec)
        .transpose()?
        .unwrap_or_default();
    if body.len() > 262_144 {
        bail!("Bridge report exceeds 256 KiB");
    }
    write!(stream,"{method} {route} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",body.len())?;
    stream.write_all(&body)?;
    let mut reader = BufReader::new(stream);
    let mut status = String::new();
    reader.read_line(&mut status)?;
    if status.split_whitespace().nth(1) != Some("200") {
        bail!("Bridge request failed: {}", status.trim());
    }
    let mut length = None;
    let mut size = status.len();
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            bail!("Incomplete HTTP headers");
        }
        size += line.len();
        if size > 16_384 {
            bail!("HTTP headers exceed limit");
        }
        if line == "\r\n" {
            break;
        }
        if let Some((name, value)) = line.split_once(':') {
            if name.eq_ignore_ascii_case("content-length") {
                length = Some(value.trim().parse::<usize>()?);
            }
        }
    }
    let mut result = Vec::new();
    if let Some(length) = length {
        if length > 262_144 {
            bail!("HTTP response exceeds limit");
        }
        result.resize(length, 0);
        reader.read_exact(&mut result)?;
    } else {
        reader.take(262_145).read_to_end(&mut result)?;
        if result.len() > 262_144 {
            bail!("HTTP response exceeds limit");
        }
    }
    serde_json::from_slice(&result).context("Invalid bridge JSON response")
}

pub fn send(port: u16, report: &Value) -> Result<()> {
    let response = request(port, "POST", "/api/sessions", Some(report))?;
    if response["session"]["sessionId"] != report["sessionId"] || !response["accepted"].is_boolean()
    {
        bail!("Unexpected bridge acknowledgment");
    }
    Ok(())
}

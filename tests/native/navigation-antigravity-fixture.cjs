// An owned cmd copy supplies a real agy.exe ancestor without starting an agent/model.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const manifest=process.argv[2],fixture=JSON.parse(fs.readFileSync(manifest,'utf8'));
const binary=path.join(path.dirname(manifest),'agy.exe'),input=manifest+'.event.json';
fs.copyFileSync(path.join(process.env.SystemRoot,'System32/cmd.exe'),binary);
fs.writeFileSync(input,JSON.stringify(fixture.event));
const command=`call "${fixture.helper}" provider-hook --provider antigravity --kind SessionStart --port ${fixture.port} --state-file "${fixture.cache}" < "${input}"`;
const child=spawn(binary,['/d','/q','/s','/k',`"${command}"`],{windowsVerbatimArguments:true,stdio:'inherit'});
child.on('error',error=>{console.error(error);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code || 0;});

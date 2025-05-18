import { exec } from "child_process";

const PORT = process.env.PORT || 5000;

const killCommand =
  process.platform === "win32"
    ? `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`
    : `kill -9 $(lsof -t -i:${PORT})`;

exec(killCommand, (err, stdout, stderr) => {
  if (err) {
    console.log(`No process found on port ${PORT}, starting the server...`);
  } else {
    console.log(`Killed process running on port ${PORT}`);
  }
});

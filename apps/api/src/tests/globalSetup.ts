import { spawn, ChildProcess } from 'child_process'
import path from 'path'

let server: ChildProcess

export async function setup() {
  const apiDir = path.resolve(__dirname, '../../')

  server = spawn('npx', ['tsx', 'src/index.ts'], {
    cwd: apiDir,
    env: { ...process.env, PORT: '3001' },
    stdio: 'ignore',
    detached: false,
  })

  // Poll until server is ready (max 20 seconds)
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server failed to start')), 20000)
    const check = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3001/health')
        if (res.ok) {
          clearInterval(check)
          clearTimeout(timeout)
          resolve()
        }
      } catch {
        // still starting
      }
    }, 500)
  })
}

export async function teardown() {
  if (server && server.pid) {
    process.kill(-server.pid)
  }
}

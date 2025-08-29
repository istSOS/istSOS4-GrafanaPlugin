const fs = require('fs');
const { spawn } = require('child_process');

console.log('Starting live reload server...');

let buildProcess = null;
let isBuilding = false;
let clients = [];

function triggerBuild() {
    if (isBuilding) {
        console.log('Build already in progress, skipping...');
        return;
    }
    
    isBuilding = true;
    console.log('File change detected, rebuilding plugin...');
    
    if (buildProcess) {
        buildProcess.kill();
    }
    
    buildProcess = spawn('npm', ['run', 'build'], {
        cwd: '/plugin',
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'development' },
        uid: 472, // Run as grafana user
        gid: 0
    });
    
    buildProcess.on('exit', (code) => {
        isBuilding = false;
        if (code === 0) {
            console.log('Build completed successfully');
            notifyReload();
        } else {
            console.log('Build failed with code', code);
        }
    });
    
    buildProcess.on('error', (err) => {
        console.log('Build process error:', err.message);
        isBuilding = false;
    });
}

function notifyReload() {
    console.log('Notifying clients to reload...');
    clients.forEach(client => {
        try {
            client.write('data: reload\n\n');
        } catch (e) {
            // Client disconnected, ignore
        }
    });
}

// HTTP server for live reload
const http = require('http');
const server = http.createServer((req, res) => {
    if (req.url === '/livereload.js') {
        res.writeHead(200, {'Content-Type': 'application/javascript'});
        res.end(`
            (function() {
                console.log('Live reload script loaded');
                
                function reload() {
                    console.log('Reloading page...');
                    setTimeout(() => window.location.reload(), 100);
                }
                
                function connect() {
                    const eventSource = new EventSource('http://localhost:35729/events');
                    
                    eventSource.onmessage = function(event) {
                        if (event.data === 'reload') {
                            reload();
                        }
                    };
                    
                    eventSource.onerror = function() {
                        console.log('Live reload connection lost, retrying...');
                        eventSource.close();
                        setTimeout(connect, 1000);
                    };
                }
                
                if (window.EventSource) {
                    connect();
                } else {
                    // Fallback polling for older browsers
                    setInterval(() => {
                        fetch('/api/health').then(() => {
                            // Check if we should reload by polling a timestamp
                        }).catch(() => {});
                    }, 2000);
                }
            })();
        `);
    } else if (req.url === '/events') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        
        clients.push(res);
        
        req.on('close', () => {
            clients = clients.filter(client => client !== res);
        });
        
        // Send initial connection message
        res.write('data: connected\n\n');
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(35729, () => {
    console.log('Live reload server running on port 35729');
});

// Watch for file changes using inotify
function watchFiles() {
    // Check if directories exist before watching
    const dirsToWatch = ['/plugin/src', '/plugin/pkg'].filter(dir => {
        try {
            return fs.existsSync(dir);
        } catch (e) {
            console.log(`Directory ${dir} not accessible:`, e.message);
            return false;
        }
    });
    
    if (dirsToWatch.length === 0) {
        return;
    }
    
    const chokidar = spawn('inotifywait', [
        '-r', '-m', '-e', 'modify,create,delete,move',
        ...dirsToWatch
    ], {
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    chokidar.stdout.on('data', (data) => {
        const output = data.toString();
        if (output.includes('MODIFY') || output.includes('CREATE') || output.includes('DELETE') || output.includes('MOVE')) {
            // Debounce rapid file changes
            clearTimeout(watchFiles.timeout);
            watchFiles.timeout = setTimeout(triggerBuild, 300);
        }
    });
    
    chokidar.stderr.on('data', (data) => {
        console.error('File watcher error:', data.toString());
    });
    
    chokidar.on('exit', (code) => {
        console.log('File watcher exited with code', code);
        setTimeout(watchFiles, 2000);
    });
    
    chokidar.on('error', (err) => {
        console.error('File watcher spawn error:', err.message);
        setTimeout(watchFiles, 2000);
    });
    
    console.log('File watching started for directories:', dirsToWatch);
}

// Start watching after a delay
setTimeout(watchFiles, 1000);

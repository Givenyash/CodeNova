const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const History = require('../models/History');

// Dangerous code patterns to block
const DANGEROUS_PATTERNS = [
  /\bimport\s+os\b/i,
  /\bfrom\s+os\b/i,
  /\bimport\s+subprocess\b/i,
  /\bfrom\s+subprocess\b/i,
  /\bimport\s+sys\b/i,
  /\bfrom\s+sys\b/i,
  /\bopen\s*\(/i,
  /\bexec\s*\(/i,
  /\beval\s*\(/i,
  /\b__import__\s*\(/i,
  /\bcompile\s*\(/i,
  /\bgetattr\s*\(/i,
  /\bsetattr\s*\(/i,
  /\bglobals\s*\(/i,
  /\blocals\s*\(/i,
  /\bimport\s+shutil\b/i,
  /\bfrom\s+shutil\b/i,
  /\bimport\s+socket\b/i,
  /\bfrom\s+socket\b/i,
  /\bimport\s+ctypes\b/i,
  /\bfrom\s+ctypes\b/i,
];

// Sanitize code for security
const sanitizeCode = (code) => {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { 
        safe: false, 
        error: 'Security violation: Potentially dangerous code detected' 
      };
    }
  }
  return { safe: true, error: null };
};

// Execute Python code safely
const executePythonCode = (code, timeout = 5000) => {
  return new Promise((resolve) => {
    const { safe, error } = sanitizeCode(code);
    
    if (!safe) {
      return resolve({
        stdout: '',
        stderr: error,
        status: 'error',
        execution_time: 0
      });
    }
    
    const startTime = Date.now();
    const tempFile = path.join(os.tmpdir(), `code_${Date.now()}_${Math.random().toString(36).slice(2)}.py`);
    
    // Write code to temporary file
    fs.writeFileSync(tempFile, code);
    
    const pythonProcess = spawn('python3', [tempFile]);
    let stdout = '';
    let stderr = '';
    let killed = false;
    
    // Set timeout
    const timer = setTimeout(() => {
      killed = true;
      pythonProcess.kill('SIGKILL');
    }, timeout);
    
    // Capture stdout
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    // Capture stderr
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    // Handle process close
    pythonProcess.on('close', (exitCode) => {
      clearTimeout(timer);
      
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore file deletion errors
      }
      
      const executionTime = (Date.now() - startTime) / 1000;
      
      if (killed) {
        resolve({
          stdout: '',
          stderr: 'Execution timed out (5 second limit exceeded)',
          status: 'timeout',
          execution_time: executionTime
        });
      } else {
        resolve({
          stdout,
          stderr,
          status: exitCode === 0 ? 'success' : 'error',
          execution_time: executionTime
        });
      }
    });
    
    // Handle process error
    pythonProcess.on('error', (err) => {
      clearTimeout(timer);
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore
      }
      resolve({
        stdout: '',
        stderr: `Execution error: ${err.message}`,
        status: 'error',
        execution_time: (Date.now() - startTime) / 1000
      });
    });
  });
};

// Run code endpoint
exports.runCode = async (req, res) => {
  try {
    const { code, language = 'python' } = req.body;
    
    // Validate input
    if (!code) {
      return res.status(400).json({ 
        success: false,
        message: 'Code is required' 
      });
    }
    
    if (language !== 'python') {
      return res.status(400).json({ 
        success: false,
        message: 'Only Python is currently supported' 
      });
    }
    
    // Execute code
    const result = await executePythonCode(code);
    
    // Save to history
    await History.create({
      user_id: req.user.id,
      code,
      language,
      stdout: result.stdout,
      stderr: result.stderr,
      status: result.status,
      execution_time: result.execution_time
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Code execution error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Code execution failed' 
    });
  }
};

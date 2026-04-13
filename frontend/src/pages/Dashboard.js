import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { 
  Play, 
  Trash2, 
  Save, 
  FolderCode, 
  History, 
  Zap, 
  LogOut, 
  Loader2,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Moon,
  Sun
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_CODE = `# Welcome to CodeNOVA!
# Write your Python code here and click Run to execute it.

def greet(name):
    return f"Hello, {name}! Welcome to CodeNOVA."

# Example usage
message = greet("Developer")
print(message)

# Try some calculations
numbers = [1, 2, 3, 4, 5]
print(f"Sum: {sum(numbers)}")
print(f"Average: {sum(numbers) / len(numbers)}")
`;

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [output, setOutput] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [snippets, setSnippets] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('snippets');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [snippetName, setSnippetName] = useState('');
  const [savingSnippet, setSavingSnippet] = useState(false);
  const [theme, setTheme] = useState('dark');

  const fetchSnippets = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/snippets`, { withCredentials: true });
      setSnippets(response.data);
    } catch (error) {
      console.error('Failed to fetch snippets:', error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/history`, { withCredentials: true });
      setHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  useEffect(() => {
    fetchSnippets();
    fetchHistory();
  }, [fetchSnippets, fetchHistory]);

  const runCode = async () => {
    setIsRunning(true);
    setOutput([{ type: 'info', text: 'Running code...' }]);

    try {
      const response = await axios.post(
        `${API}/run-code`,
        { code, language: 'python' },
        { withCredentials: true }
      );

      const newOutput = [];
      
      if (response.data.stdout) {
        newOutput.push({ type: 'stdout', text: response.data.stdout });
      }
      
      if (response.data.stderr) {
        newOutput.push({ type: 'stderr', text: response.data.stderr });
      }

      if (response.data.status === 'success') {
        newOutput.push({ 
          type: 'success', 
          text: `Execution completed in ${response.data.execution_time.toFixed(3)}s` 
        });
      } else if (response.data.status === 'timeout') {
        newOutput.push({ type: 'error', text: 'Execution timed out (5 second limit)' });
      } else if (response.data.status === 'error') {
        newOutput.push({ type: 'error', text: 'Execution failed' });
      }

      setOutput(newOutput);
      fetchHistory();
    } catch (error) {
      setOutput([{ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to execute code' 
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const saveSnippet = async () => {
    if (!snippetName.trim()) return;
    
    setSavingSnippet(true);
    try {
      await axios.post(
        `${API}/snippets`,
        { name: snippetName, code, language: 'python' },
        { withCredentials: true }
      );
      setSnippetName('');
      setSaveDialogOpen(false);
      fetchSnippets();
    } catch (error) {
      console.error('Failed to save snippet:', error);
    } finally {
      setSavingSnippet(false);
    }
  };

  const loadSnippet = (snippet) => {
    setCode(snippet.code);
  };

  const deleteSnippet = async (snippetId) => {
    try {
      await axios.delete(`${API}/snippets/${snippetId}`, { withCredentials: true });
      fetchSnippets();
    } catch (error) {
      console.error('Failed to delete snippet:', error);
    }
  };

  const loadHistory = (historyItem) => {
    setCode(historyItem.code);
  };

  const clearHistory = async () => {
    try {
      await axios.delete(`${API}/history`, { withCredentials: true });
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  const handleEditorChange = (value) => {
    setCode(value || '');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-3 w-3 text-cn-success" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-cn-error" />;
      case 'timeout':
        return <AlertCircle className="h-3 w-3 text-cn-secondary" />;
      default:
        return <Clock className="h-3 w-3 text-cn-text-secondary" />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-cn-background" data-testid="dashboard">
      {/* Header */}
      <header className="h-14 border-b border-cn-border flex items-center justify-between px-4 bg-cn-surface">
        <div className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-cn-secondary" />
          <span className="font-heading text-xl font-bold tracking-tighter text-cn-text-primary">
            Code<span className="text-cn-secondary">NOVA</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            data-testid="theme-toggle"
            className="text-cn-text-secondary hover:text-cn-text-primary"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <span className="text-sm text-cn-text-secondary">
            {user?.name || user?.email}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            data-testid="logout-button"
            className="text-cn-text-secondary hover:text-cn-error"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-cn-border bg-cn-surface flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-cn-border">
            <button
              onClick={() => setActiveTab('snippets')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'snippets'
                  ? 'text-cn-primary border-b-2 border-cn-primary'
                  : 'text-cn-text-secondary hover:text-cn-text-primary'
              }`}
              data-testid="snippets-tab"
            >
              <FolderCode className="h-4 w-4 inline mr-2" />
              Snippets
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-cn-primary border-b-2 border-cn-primary'
                  : 'text-cn-text-secondary hover:text-cn-text-primary'
              }`}
              data-testid="history-tab"
            >
              <History className="h-4 w-4 inline mr-2" />
              History
            </button>
          </div>

          {/* Sidebar Content */}
          <ScrollArea className="flex-1">
            {activeTab === 'snippets' ? (
              <div className="p-2">
                {snippets.length === 0 ? (
                  <div className="text-center py-8 text-cn-text-secondary text-sm">
                    No saved snippets yet.
                    <br />
                    Save your code to access it later.
                  </div>
                ) : (
                  snippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      className="group p-3 rounded-md hover:bg-cn-background cursor-pointer transition-colors mb-1"
                      data-testid="snippet-list-item"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => loadSnippet(snippet)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <ChevronRight className="h-3 w-3 text-cn-text-secondary" />
                            <span className="text-sm font-medium text-cn-text-primary truncate">
                              {snippet.name}
                            </span>
                          </div>
                          <div className="text-xs text-cn-text-secondary mt-1 ml-5">
                            {formatDate(snippet.updated_at)}
                          </div>
                        </button>
                        <button
                          onClick={() => deleteSnippet(snippet.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-cn-text-secondary hover:text-cn-error transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="p-2">
                {history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="w-full mb-2 text-cn-text-secondary hover:text-cn-error text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear History
                  </Button>
                )}
                {history.length === 0 ? (
                  <div className="text-center py-8 text-cn-text-secondary text-sm">
                    No execution history yet.
                    <br />
                    Run some code to see it here.
                  </div>
                ) : (
                  history.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => loadHistory(item)}
                      className="w-full p-3 rounded-md hover:bg-cn-background cursor-pointer transition-colors mb-1 text-left"
                      data-testid="history-list-item"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <span className="text-xs text-cn-text-secondary">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      <div className="text-xs text-cn-text-secondary mt-1 font-mono truncate">
                        {item.code.split('\n')[0]}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Editor Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="h-12 border-b border-cn-border flex items-center justify-between px-4 bg-cn-surface">
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono text-cn-text-secondary">main.py</span>
              <span className="px-2 py-0.5 rounded text-xs bg-cn-primary/20 text-cn-primary">
                Python
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="save-snippet-button"
                    className="border-cn-border text-cn-text-secondary hover:text-cn-text-primary hover:border-cn-text-secondary"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-cn-surface border-cn-border">
                  <DialogHeader>
                    <DialogTitle className="text-cn-text-primary font-heading">Save Snippet</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="snippet-name" className="text-cn-text-primary">Snippet Name</Label>
                      <Input
                        id="snippet-name"
                        value={snippetName}
                        onChange={(e) => setSnippetName(e.target.value)}
                        placeholder="My awesome code"
                        data-testid="snippet-name-input"
                        className="bg-cn-background border-cn-border text-cn-text-primary"
                      />
                    </div>
                    <Button
                      onClick={saveSnippet}
                      disabled={!snippetName.trim() || savingSnippet}
                      className="w-full bg-cn-primary hover:bg-cn-primary-hover"
                      data-testid="save-snippet-confirm"
                    >
                      {savingSnippet ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Snippet'
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={runCode}
                disabled={isRunning}
                data-testid="run-code-button"
                className="bg-cn-primary hover:bg-cn-primary-hover text-white transition-all duration-150 hover:-translate-y-[1px]"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Editor and Console Split */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Code Editor */}
            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="python"
                value={code}
                onChange={handleEditorChange}
                theme={theme === 'dark' ? 'vs-dark' : 'light'}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  padding: { top: 16, bottom: 16 },
                  lineNumbers: 'on',
                  renderLineHighlight: 'line',
                  automaticLayout: true,
                }}
                data-testid="code-editor"
              />
            </div>

            <Separator className="bg-cn-border" />

            {/* Console Panel */}
            <div className="h-64 flex flex-col bg-cn-console-bg">
              <div className="h-10 border-b border-cn-border flex items-center justify-between px-4 bg-cn-surface">
                <span className="text-sm font-medium text-cn-text-secondary">Console Output</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearOutput}
                  data-testid="clear-console-button"
                  className="text-cn-text-secondary hover:text-cn-text-primary h-7"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="console-output" data-testid="console-output">
                  {output.length === 0 ? (
                    <div className="text-cn-text-secondary text-sm">
                      Output will appear here when you run your code.
                    </div>
                  ) : (
                    output.map((line, index) => (
                      <div
                        key={index}
                        className={`whitespace-pre-wrap mb-1 ${
                          line.type === 'error' || line.type === 'stderr'
                            ? 'text-cn-error'
                            : line.type === 'success'
                            ? 'text-cn-success'
                            : line.type === 'info'
                            ? 'text-cn-primary'
                            : 'text-cn-text-secondary'
                        }`}
                      >
                        {line.text}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

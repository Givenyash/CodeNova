import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Zap, Loader2, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cn-background bg-grid-pattern flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="h-8 w-8 text-cn-secondary" />
          <span className="font-heading text-3xl font-bold tracking-tighter text-cn-text-primary">
            Code<span className="text-cn-secondary">NOVA</span>
          </span>
        </div>

        <Card className="bg-cn-surface border-cn-border">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-heading font-bold text-cn-text-primary">
              Create an account
            </CardTitle>
            <CardDescription className="text-cn-text-secondary">
              Start coding with CodeNOVA today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div 
                  data-testid="register-error" 
                  className="p-3 rounded-md bg-cn-error/10 border border-cn-error/20 text-cn-error text-sm"
                >
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-cn-text-primary">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  data-testid="register-name-input"
                  className="bg-cn-background border-cn-border text-cn-text-primary placeholder:text-cn-text-secondary/50 focus:border-cn-primary focus:ring-cn-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-cn-text-primary">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="register-email-input"
                  className="bg-cn-background border-cn-border text-cn-text-primary placeholder:text-cn-text-secondary/50 focus:border-cn-primary focus:ring-cn-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-cn-text-primary">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    data-testid="register-password-input"
                    className="bg-cn-background border-cn-border text-cn-text-primary placeholder:text-cn-text-secondary/50 focus:border-cn-primary focus:ring-cn-primary pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cn-text-secondary hover:text-cn-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-cn-text-primary">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  data-testid="register-confirm-password-input"
                  className="bg-cn-background border-cn-border text-cn-text-primary placeholder:text-cn-text-secondary/50 focus:border-cn-primary focus:ring-cn-primary"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                data-testid="register-submit-button"
                className="w-full bg-cn-primary hover:bg-cn-primary-hover text-white font-medium transition-all duration-150 hover:-translate-y-[1px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create account'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-cn-text-secondary">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-cn-primary hover:text-cn-primary-hover transition-colors font-medium"
                data-testid="login-link"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

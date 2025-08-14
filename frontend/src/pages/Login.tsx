import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { apiClient, ApiError } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';


export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const navigate = useNavigate();

  const { mutate: loginUser, isPending: isLoading } = useMutation({
    mutationFn: () => 
      apiClient.post<{ token: string }, any>('/auth/login', { email, password }),
    onSuccess: (data) => {
      auth.login(data.token);
      navigate('/');
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        if (error.status === 401) {
            toast({
                title: 'Login Failed',
                description: 'Incorrect email or password. Please try again.',
                variant: 'destructive',
            });
        } else {
             toast({
                title: 'An error occurred',
                description: 'Something went wrong on the server.',
                variant: 'destructive',
            });
        }
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginUser();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-50">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 gradient-primary rounded-full blur-3xl opacity-20 animate-bounce-gentle"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 gradient-success rounded-full blur-3xl opacity-20 animate-bounce-gentle" style={{ animationDelay: '1s' }}></div>
        </div>
      </div>

      <div className="relative w-full max-w-md">
        <Card className="glass-card shadow-glow border-0">
          <CardHeader className="text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-2xl">D</span>
            </div>
            
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold text-gradient-primary">
                Welcome to DailyZen
              </CardTitle>
              <CardDescription className="text-lg">
                Continue your growth journey
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pr-4 h-12 transition-smooth focus:shadow-glow"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-12 h-12 transition-smooth focus:shadow-glow"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-12 px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox id="rememberMe" />
                  <Label htmlFor="rememberMe" className="text-sm text-muted-foreground cursor-pointer">
                    Remember me
                  </Label>
                </div>
                
                <Button
                  type="button"
                  variant="link"
                  className="px-0 text-sm text-primary hover:text-primary-glow"
                >
                  Forgot password?
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full h-12 text-base font-medium transition-spring",
                  "gradient-primary shadow-glow hover:shadow-lg",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
             
              {/* Registration part to be added later */}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
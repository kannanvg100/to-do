import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import { LoginPage } from "./features/auth/LoginPage";
import { TodoApp } from "./features/todos/TodoApp";

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return session ? <TodoApp /> : <LoginPage />;
}

function App() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </div>
  );
}

export default App;

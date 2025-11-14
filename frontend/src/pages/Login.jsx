import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { useI18n } from '../utils/useI18n';
import styles from './Login.module.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      setLoading(false);

      if (result.success) {
        // Small delay to ensure state is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || 'An unexpected error occurred');
      console.error('Login error:', err);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label htmlFor="email">{t('login.email')}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">{t('login.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? t('login.loggingIn') : t('login.loginButton')}
          </button>
        </form>
        <div className={styles.demo}>
          <p>{t('login.demoCredentials')}</p>
          <p>{t('login.demoEmail')}</p>
        </div>
      </div>
    </div>
  );
}

export default Login;


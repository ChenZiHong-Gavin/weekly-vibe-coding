import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#fff', background: '#0a0a0a' }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>Page not found</p>
      <button onClick={() => navigate('/')} style={{ padding: '0.5rem 1.5rem', fontSize: '1rem', cursor: 'pointer', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px' }}>
        Back to Home
      </button>
    </div>
  );
};

export default NotFound;

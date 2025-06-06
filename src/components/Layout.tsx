import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import HomeIcon from '@mui/icons-material/Home';
import MapIcon from '@mui/icons-material/Map';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import PersonIcon from '@mui/icons-material/Person';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return <Box>Loading...</Box>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  const getCurrentTab = () => {
    const path = location.pathname;
    if (path === '/map') return 1;
    if (path === '/leaderboard') return 2;
    if (path === '/profile') return 3;
    return 0;
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Box sx={{ flexGrow: 1, overflow: 'auto', pb: 7 }}>
        <Outlet />
      </Box>
      <BottomNavigation
        value={getCurrentTab()}
        onChange={(_, newValue) => {
          switch (newValue) {
            case 0:
              navigate('/');
              break;
            case 1:
              navigate('/map');
              break;
            case 2:
              navigate('/leaderboard');
              break;
            case 3:
              navigate('/profile');
              break;
          }
        }}
        showLabels
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: '1px solid rgba(0, 0, 0, 0.12)',
          zIndex: 1000,
          height: 56,
          minHeight: 48,
          '@media (max-width: 600px)': {
            height: 48,
            minHeight: 40,
          },
        }}
      >
        <BottomNavigationAction label="Quests" icon={<HomeIcon sx={{ fontSize: 22 }} />} sx={{ minWidth: 0, py: 0.5 }} />
        <BottomNavigationAction label="Map" icon={<MapIcon sx={{ fontSize: 22 }} />} sx={{ minWidth: 0, py: 0.5 }} />
        <BottomNavigationAction label="Leaderboard" icon={<LeaderboardIcon sx={{ fontSize: 22 }} />} sx={{ minWidth: 0, py: 0.5 }} />
        <BottomNavigationAction label="Profile" icon={<PersonIcon sx={{ fontSize: 22 }} />} sx={{ minWidth: 0, py: 0.5 }} />
      </BottomNavigation>
    </Box>
  );
};

export default Layout; 
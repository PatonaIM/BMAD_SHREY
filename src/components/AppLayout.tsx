'use client';
import React from 'react';
import type { ReactNode } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Avatar,
  Skeleton,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Link from 'next/link';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps): React.ReactElement {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>): void => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (): void => {
    setAnchorEl(null);
  };

  const handleSignOut = async (): Promise<void> => {
    handleMenuClose();
    await signOut({ callbackUrl: '/login' });
  };

  const isActive = (path: string): boolean => pathname === path;

  const publicLinks = [
    { label: 'Home', path: '/' },
    { label: 'Jobs', path: '/jobs' },
  ];

  const authenticatedLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Profile', path: '/profile' },
  ];

  const loading = status === 'loading';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Logo/Brand */}
          <Typography
            variant="h6"
            component={Link}
            href="/"
            sx={{
              flexGrow: 0,
              mr: 4,
              fontWeight: 700,
              textDecoration: 'none',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            Teamified
          </Typography>

          {/* Desktop Navigation */}
          {!isMobile && (
            <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
              {publicLinks.map(link => (
                <Button
                  key={link.path}
                  component={Link}
                  href={link.path}
                  color="inherit"
                  sx={{
                    fontWeight: isActive(link.path) ? 600 : 400,
                    borderBottom: isActive(link.path)
                      ? '2px solid currentColor'
                      : 'none',
                    borderRadius: 0,
                    px: 2,
                  }}
                >
                  {link.label}
                </Button>
              ))}
              {session &&
                authenticatedLinks.map(link => (
                  <Button
                    key={link.path}
                    component={Link}
                    href={link.path}
                    color="inherit"
                    sx={{
                      fontWeight: isActive(link.path) ? 600 : 400,
                      borderBottom: isActive(link.path)
                        ? '2px solid currentColor'
                        : 'none',
                      borderRadius: 0,
                      px: 2,
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
            </Box>
          )}

          {/* Mobile Menu Icon */}
          {isMobile && (
            <Box sx={{ flexGrow: 1 }}>
              <IconButton
                color="inherit"
                aria-label="menu"
                onClick={handleMenuOpen}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}

          {/* Auth Section */}
          {loading ? (
            <Skeleton variant="circular" width={40} height={40} />
          ) : session ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {!isMobile && (
                <Typography variant="body2" sx={{ color: 'inherit' }}>
                  {session.user?.email}
                </Typography>
              )}
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                aria-label="account menu"
              >
                <Avatar
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                >
                  {session.user?.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                component={Link}
                href="/login"
                color="inherit"
                variant="outlined"
                size="small"
              >
                Login
              </Button>
              <Button
                component={Link}
                href="/register"
                color="secondary"
                variant="contained"
                size="small"
              >
                Sign Up
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {isMobile &&
          publicLinks.map(link => (
            <MenuItem
              key={link.path}
              component={Link}
              href={link.path}
              onClick={handleMenuClose}
              selected={isActive(link.path)}
            >
              {link.label}
            </MenuItem>
          ))}
        {isMobile &&
          session &&
          authenticatedLinks.map(link => (
            <MenuItem
              key={link.path}
              component={Link}
              href={link.path}
              onClick={handleMenuClose}
              selected={isActive(link.path)}
            >
              {link.label}
            </MenuItem>
          ))}
        {session && (
          <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
            Sign Out
          </MenuItem>
        )}
      </Menu>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {children}
        </Container>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
}

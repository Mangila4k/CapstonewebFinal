/**
 * Supabase Helper Functions
 * HES - HES, PLSNHS Enrollment System
 * 
 * Kini nga file kay naghatag og helper functions para sa:
 * - Authentication (login, logout, register)
 * - User role management
 * - Database queries
 */

import { supabase } from './config.js';

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Login user with email and password
 */
export async function loginUser(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password
        });

        if (error) throw error;
        return { success: true, user: data.user, session: data.session };
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Logout current user
 */
export async function logoutUser() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Logout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Register new user
 */
export async function registerUser(email, password, metadata = {}) {
    try {
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
            options: {
                data: metadata
            }
        });

        if (error) throw error;
        return { success: true, user: data.user };
    } catch (error) {
        console.error('❌ Register error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current session
 */
export async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return { success: true, session };
    } catch (error) {
        console.error('❌ Get session error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return { success: true, user };
    } catch (error) {
        console.error('❌ Get user error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/auth/reset_password.html'
        });

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('❌ Reset password error:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// USER ROLE HELPERS
// ============================================

/**
 * Get user role from 'users' table
 */
export async function getUserRole(uid) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('role')
            .eq('id', uid)
            .maybeSingle();

        if (error) throw error;
        return data?.role || 'student';
    } catch (error) {
        console.error('❌ Get role error:', error);
        return 'student';
    }
}

/**
 * Get full user profile from 'users' table
 */
export async function getUserProfile(uid) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', uid)
            .maybeSingle();

        if (error) throw error;
        return { success: true, profile: data };
    } catch (error) {
        console.error('❌ Get profile error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get dashboard route based on role
 */
export function getDashboardRoute(role) {
    const routes = {
        'admin': '../admin/dashboard.html',
        'teacher': '../teacher/dashboard.html',
        'student': '../student/dashboard.html',
        'registrar': '../registrar/dashboard.html',
        'principal': '../principal/dashboard.html',
        'guidance': '../guidance/dashboard.html'
    };
    return routes[role] || '../student/dashboard.html';
}

// ============================================
// EXPORT SUPABASE CLIENT
// ============================================

export { supabase };
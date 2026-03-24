import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'secretaire';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    role: UserRole;
    isAdmin: boolean;
    isSecretaire: boolean;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    setRole: (role: UserRole) => void; // Keep for manual override if needed, or remove
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<UserRole>('admin');

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            determineRole(session?.user);
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            determineRole(session?.user);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const determineRole = (user: User | undefined | null) => {
        // Force admin role for everyone as requested
        setRole('admin');
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    const isAdmin = role === 'admin';
    const isSecretaire = role === 'secretaire';

    return (
        <AuthContext.Provider value={{
            session,
            user,
            role,
            isAdmin,
            isSecretaire,
            loading,
            signIn,
            signUp,
            signOut,
            setRole // Exposed for testing/switching if needed
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

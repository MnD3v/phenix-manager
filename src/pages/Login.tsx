import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo-phenix.png";

const Login = () => {
    // Auth State
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const { signIn, signUp } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signIn(email.trim(), password);
            toast.success("Connexion réussie");
            navigate("/");
        } catch (error: any) {
            if (error.message === "Invalid login credentials") {
                toast.error("Email ou mot de passe incorrect.");
            } else if (error.message.includes("Email not confirmed")) {
                toast.error("Veuillez confirmer votre adresse email avant de vous connecter.");
            } else {
                toast.error("Erreur de connexion: " + error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signUp(email.trim(), password);
            toast.success("Inscription réussie ! Veuillez vérifier vos emails.", { duration: 5000 });
        } catch (error: any) {
            toast.error("Erreur lors de l'inscription: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <Card className="w-full max-w-md shadow-lg border-primary/10">
                <CardHeader className="space-y-4 flex flex-col items-center text-center pb-6">
                    <div className="h-16 w-16 rounded-2xl bg-white shadow-sm p-1 flex items-center justify-center ring-1 ring-border">
                        <img src={logo} alt="Phenix" className="h-full w-full object-contain rounded-xl" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="login" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Connexion</TabsTrigger>
                            <TabsTrigger value="signup">Inscription</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login" className="space-y-4">
                            <div className="space-y-2 text-center mb-6">
                                <CardTitle className="text-xl font-bold">Bienvenue</CardTitle>
                                <CardDescription>Accédez à votre espace de gestion</CardDescription>
                            </div>
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-login">Email</Label>
                                    <Input
                                        id="email-login"
                                        type="email"
                                        placeholder="admin@phenix.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="password-login">Mot de passe</Label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            {showPassword ? "Masquer" : "Afficher"}
                                        </button>
                                    </div>
                                    <Input
                                        id="password-login"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Chargement..." : "Se connecter"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup" className="space-y-4">
                            <div className="space-y-2 text-center mb-6">
                                <CardTitle className="text-xl font-bold">Créer un compte</CardTitle>
                                <CardDescription>Rejoignez Phenix Immobilier</CardDescription>
                            </div>
                            <form onSubmit={handleSignup} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email-signup">Email</Label>
                                    <Input
                                        id="email-signup"
                                        type="email"
                                        placeholder="nouveau@phenix.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="password-signup">Mot de passe</Label>
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                        >
                                            {showPassword ? "Masquer" : "Afficher"}
                                        </button>
                                    </div>
                                    <Input
                                        id="password-signup"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? "Création..." : "S'inscrire"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default Login;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye, Filter, Download, Calendar } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface AuditLog {
    id: string;
    table_name: string;
    record_id: string;
    action: "INSERT" | "UPDATE" | "DELETE";
    old_data: any;
    new_data: any;
    user_id: string | null;
    user_email: string | null;
    created_at: string;
}

const AuditLogs = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTable, setSelectedTable] = useState<string>("all");
    const [selectedAction, setSelectedAction] = useState<string>("all");
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [dateFilter, setDateFilter] = useState("");

    // Pagination
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;
    const [hasMore, setHasMore] = useState(true);

    useEffect(() => {
        fetchAuditLogs();
    }, [page, selectedTable, selectedAction, dateFilter]);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(0); // Reset page on search
            fetchAuditLogs();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from("audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            // Filtres serveur
            if (selectedTable !== "all") {
                query = query.eq("table_name", selectedTable);
            }

            if (selectedAction !== "all") {
                query = query.eq("action", selectedAction);
            }

            if (dateFilter) {
                // Supabase date filtering usually requires a range for the whole day
                const startDate = new Date(dateFilter);
                startDate.setHours(0, 0, 0, 0);
                const endDate = new Date(dateFilter);
                endDate.setHours(23, 59, 59, 999);

                query = query.gte("created_at", startDate.toISOString())
                    .lte("created_at", endDate.toISOString());
            }

            if (searchTerm) {
                query = query.or(`user_email.ilike.%${searchTerm}%,record_id.ilike.%${searchTerm}%,table_name.ilike.%${searchTerm}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            setLogs(data || []);
            setHasMore(data && data.length === PAGE_SIZE);
        } catch (error: any) {
            console.error("Error fetching audit logs:", error);
            toast.error("Erreur lors du chargement des logs d'audit");
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (resetPage = true) => {
        if (resetPage) setPage(0);
        // The useEffects will trigger the fetch
    };

    const getActionBadge = (action: string) => {
        const variants: Record<string, any> = {
            INSERT: "default",
            UPDATE: "secondary",
            DELETE: "destructive",
        };

        const labels: Record<string, string> = {
            INSERT: "Ajout",
            UPDATE: "Modification",
            DELETE: "Suppression",
        };

        return (
            <Badge variant={variants[action] || "default"}>
                {labels[action] || action}
            </Badge>
        );
    };

    const getTableLabel = (tableName: string) => {
        const labels: Record<string, string> = {
            biens: "Biens",
            proprietaires: "Propriétaires",
            locataires: "Locataires",
            contrats: "Contrats",
            paiements: "Paiements",
            depenses: "Dépenses",
        };
        return labels[tableName] || tableName;
    };

    const viewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setShowDetailsDialog(true);
    };

    const exportToCSV = async () => {
        // Pour l'export, on récupère tout (ou une limite plus large)
        try {
            const { data, error } = await supabase
                .from("audit_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(1000);

            if (error) throw error;
            if (!data) return;

            const headers = [
                "Date/Heure",
                "Table",
                "Action",
                "Utilisateur",
                "ID Enregistrement",
            ];
            const csvContent = [
                headers.join(","),
                ...data.map((log) =>
                    [
                        format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                            locale: fr,
                        }),
                        getTableLabel(log.table_name),
                        log.action,
                        log.user_email || "Système",
                        log.record_id,
                    ].join(",")
                ),
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute(
                "download",
                `audit_logs_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
            );
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Export CSV réussi");
        } catch (error) {
            console.error("Erreur export CSV:", error);
            toast.error("Erreur lors de l'export CSV");
        }
    };

    const getChangedFields = (oldData: any, newData: any) => {
        if (!oldData || !newData) return [];

        const changes: { field: string; oldValue: any; newValue: any }[] = [];
        const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

        allKeys.forEach((key) => {
            if (
                key !== "updated_at" &&
                key !== "created_at" &&
                JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
            ) {
                changes.push({
                    field: key,
                    oldValue: oldData[key],
                    newValue: newData[key],
                });
            }
        });

        return changes;
    };

    // Note: We can't easily get all unique tables from server without a separate query or hardcoding.
    // For now, let's use a predefined list or fetch distinct tables if needed.
    // Using a static list for better performance as table names don't change often.
    const uniqueTables = ["biens", "proprietaires", "locataires", "contrats", "paiements", "depenses", "sms_rappels_envois"];

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Journal d'Audit</h1>
                    <p className="text-muted-foreground mt-1">
                        Historique de toutes les actions effectuées dans le système
                    </p>
                </div>
                <Button onClick={exportToCSV} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exporter CSV
                </Button>
            </div>

            {/* Filtres */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtres
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Select value={selectedTable} onValueChange={(val) => { setSelectedTable(val); setPage(0); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Toutes les tables" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les tables</SelectItem>
                                {uniqueTables.map((table) => (
                                    <SelectItem key={table} value={table}>
                                        {getTableLabel(table)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedAction} onValueChange={(val) => { setSelectedAction(val); setPage(0); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Toutes les actions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Toutes les actions</SelectItem>
                                <SelectItem value="INSERT">Ajout</SelectItem>
                                <SelectItem value="UPDATE">Modification</SelectItem>
                                <SelectItem value="DELETE">Suppression</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="relative">
                            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => { setDateFilter(e.target.value); setPage(0); }}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    {(searchTerm || selectedTable !== "all" || selectedAction !== "all" || dateFilter) && (
                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {/* Note: Total count is hard to get with simple query, showing current page count or just filters active */}
                                Filtres actifs
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedTable("all");
                                    setSelectedAction("all");
                                    setDateFilter("");
                                    setPage(0);
                                }}
                            >
                                Réinitialiser les filtres
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Table des logs */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date/Heure</TableHead>
                                    <TableHead>Table</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Utilisateur</TableHead>
                                    <TableHead>ID Enregistrement</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Chargement...
                                        </TableCell>
                                    </TableRow>
                                ) : logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8">
                                            Aucun log d'audit trouvé
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-mono text-sm">
                                                {format(
                                                    new Date(log.created_at),
                                                    "dd/MM/yyyy HH:mm:ss",
                                                    { locale: fr }
                                                )}
                                            </TableCell>
                                            <TableCell>{getTableLabel(log.table_name)}</TableCell>
                                            <TableCell>{getActionBadge(log.action)}</TableCell>
                                            <TableCell>
                                                {log.user_email || (
                                                    <span className="text-muted-foreground italic">
                                                        Système
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {log.record_id.substring(0, 8)}...
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => viewDetails(log)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-end space-x-2 p-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0 || loading}
                        >
                            Précédent
                        </Button>
                        <div className="text-sm font-medium">
                            Page {page + 1}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={!hasMore || loading}
                        >
                            Suivant
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog de détails */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Détails du log d'audit</DialogTitle>
                        <DialogDescription>
                            Informations complètes sur l'action effectuée
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLog && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Date/Heure
                                    </p>
                                    <p className="font-mono">
                                        {format(
                                            new Date(selectedLog.created_at),
                                            "dd/MM/yyyy HH:mm:ss",
                                            { locale: fr }
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Table
                                    </p>
                                    <p>{getTableLabel(selectedLog.table_name)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Action
                                    </p>
                                    <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        Utilisateur
                                    </p>
                                    <p>{selectedLog.user_email || "Système"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">
                                        ID Enregistrement
                                    </p>
                                    <p className="font-mono text-sm">{selectedLog.record_id}</p>
                                </div>
                            </div>

                            {selectedLog.action === "UPDATE" && (
                                <div>
                                    <h3 className="font-semibold mb-2">Modifications</h3>
                                    <div className="space-y-2">
                                        {getChangedFields(
                                            selectedLog.old_data,
                                            selectedLog.new_data
                                        ).map((change, index) => (
                                            <div
                                                key={index}
                                                className="border rounded-lg p-3 bg-muted/50"
                                            >
                                                <p className="font-medium text-sm mb-1">
                                                    {change.field}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Avant:</p>
                                                        <p className="font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                                                            {JSON.stringify(change.oldValue)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Après:</p>
                                                        <p className="font-mono bg-green-50 dark:bg-green-950 p-2 rounded">
                                                            {JSON.stringify(change.newValue)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedLog.action === "INSERT" && selectedLog.new_data && (
                                <div>
                                    <h3 className="font-semibold mb-2">Données ajoutées</h3>
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                        {JSON.stringify(selectedLog.new_data, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {selectedLog.action === "DELETE" && selectedLog.old_data && (
                                <div>
                                    <h3 className="font-semibold mb-2">Données supprimées</h3>
                                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                                        {JSON.stringify(selectedLog.old_data, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AuditLogs;

import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, ArrowLeft, Download, Receipt, Printer, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { AddDocumentDialog } from "../components/services/AddDocumentDialog";
import { RecordPaymentDialog } from "../components/services/RecordPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SortAsc, SortDesc } from "lucide-react";

const ServiceDetails = () => {
    const { id } = useParams<{ id: string }>();
    const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
    const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<any>(null);
    const [documentType, setDocumentType] = useState<"proforma" | "facture" | "devis">("facture");
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState("all");
    const [sortBy, setSortBy] = useState("date-desc");

    const { data: service, isLoading: isServiceLoading } = useQuery({
        queryKey: ["service", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("services")
                .select("*")
                .eq("id", id)
                .single();
            if (error) throw error;
            return data;
        },
    });

    const { data: documents, isLoading: isDocsLoading, refetch: refetchDocs } = useQuery({
        queryKey: ["documents-service", id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("documents_services")
                .select("*")
                .eq("service_id", id)
                .order("date_document", { ascending: false });
            if (error) throw error;
            return data;
        },
    });

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;

        try {
            const { error } = await supabase.from("documents_services").delete().eq("id", docId);
            if (error) throw error;
            toast.success("Document supprimé");
            refetchDocs();
        } catch (error: any) {
            toast.error(`Erreur: ${error.message}`);
        }
    };

    const getBadgeVariant = (type: string) => {
        switch (type) {
            case "facture": return "bg-green-600 hover:bg-green-700 text-white border-transparent";
            case "devis": return "bg-blue-600 hover:bg-blue-700 text-white border-transparent";
            case "proforma": return "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent";
            default: return "";
        }
    };

    const filteredDocuments = documents?.filter(doc => {
        const matchesSearch = doc.client_nom.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = filterType === "all" || doc.type === filterType;
        return matchesSearch && matchesType;
    }).sort((a, b) => {
        switch (sortBy) {
            case "date-desc": return new Date(b.date_document).getTime() - new Date(a.date_document).getTime();
            case "date-asc": return new Date(a.date_document).getTime() - new Date(b.date_document).getTime();
            case "amount-desc": return Number(b.montant_total) - Number(a.montant_total);
            case "amount-asc": return Number(a.montant_total) - Number(b.montant_total);
            case "client": return a.client_nom.localeCompare(b.client_nom);
            default: return 0;
        }
    });

    const getPaymentBadge = (total: number, paid: number) => {
        if (paid >= total) return { label: "Soldé", variant: "default" as const, className: "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" };
        if (paid > 0) return { label: "Partiel", variant: "outline" as const, className: "bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200" };
        return { label: "En attente", variant: "outline" as const, className: "bg-red-100 text-red-800 hover:bg-red-100 border-red-200" };
    };

    if (isServiceLoading) return <div className="flex items-center justify-center min-h-[400px]">Chargement...</div>;
    if (!service) return <div className="p-8 text-center">Service non trouvé</div>;

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 gap-1">
                            <Link to="/services">
                                <ArrowLeft className="h-4 w-4" />
                                Retour aux services
                            </Link>
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        {service.nom}
                    </h1>
                    <p className="text-muted-foreground">{service.description || "Gestion des documents et finances du service"}</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => { setDocumentType("devis"); setIsAddDocumentOpen(true); }}
                        variant="outline"
                        className="gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Nouveau Devis
                    </Button>
                    <Button
                        onClick={() => { setDocumentType("proforma"); setIsAddDocumentOpen(true); }}
                        variant="outline"
                        className="gap-2"
                    >
                        <Receipt className="h-4 w-4" />
                        Nouveau Proforma
                    </Button>
                    <Button
                        onClick={() => { setDocumentType("facture"); setIsAddDocumentOpen(true); }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nouvelle Facture
                    </Button>
                </div>
            </div>

            <Card className="border-muted/60 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/5 border-b py-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            Documents
                        </CardTitle>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher un client..."
                                    className="pl-9 bg-background rounded-xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-[180px] rounded-xl bg-background">
                                    <SelectValue placeholder="Trier par" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="date-desc">Date (Récent)</SelectItem>
                                    <SelectItem value="date-asc">Date (Ancien)</SelectItem>
                                    <SelectItem value="amount-desc">Montant (Décroissant)</SelectItem>
                                    <SelectItem value="amount-asc">Montant (Croissant)</SelectItem>
                                    <SelectItem value="client">Client (A-Z)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
                            <TabsList className="bg-muted/50 p-1 rounded-xl w-full md:w-auto h-auto">
                                <TabsTrigger value="all" className="rounded-lg px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">Tout</TabsTrigger>
                                <TabsTrigger value="devis" className="rounded-lg px-6 py-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">Devis</TabsTrigger>
                                <TabsTrigger value="facture" className="rounded-lg px-6 py-2 data-[state=active]:bg-green-50 data-[state=active]:text-green-700">Factures</TabsTrigger>
                                <TabsTrigger value="proforma" className="rounded-lg px-6 py-2 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Proformas</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="font-semibold">Date</TableHead>
                                <TableHead className="font-semibold">Client</TableHead>
                                <TableHead className="font-semibold">Type</TableHead>
                                <TableHead className="font-semibold">Statut</TableHead>
                                <TableHead className="font-semibold text-right">Montant Total</TableHead>
                                <TableHead className="font-semibold text-right">Payé / Reste</TableHead>
                                <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isDocsLoading ? (
                                <TableRow><TableCell colSpan={7} className="text-center py-12">Chargement...</TableCell></TableRow>
                            ) : filteredDocuments && filteredDocuments.length > 0 ? (
                                filteredDocuments.map((doc) => (
                                    <TableRow key={doc.id} className="hover:bg-muted/5 transition-colors">
                                        <TableCell className="font-medium">
                                            {doc.date_document ? format(new Date(doc.date_document), "dd MMMM yyyy", { locale: fr }) : "-"}
                                        </TableCell>
                                        <TableCell>{doc.client_nom}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge className={`capitalize shadow-sm border-0 font-medium ${getBadgeVariant(doc.type)}`}>
                                                    {doc.type}
                                                </Badge>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {doc.type === "facture" ? (
                                                <Badge className={`shadow-none border ${getPaymentBadge(Number(doc.montant_total), Number(doc.montant_paye || 0)).className}`}>
                                                    {getPaymentBadge(Number(doc.montant_total), Number(doc.montant_paye || 0)).label}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {Number(doc.montant_total).toLocaleString("fr-FR")} <span className="text-[10px] font-normal text-muted-foreground">FCFA</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {doc.type === "facture" ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-xs font-semibold text-green-600">
                                                        {Number(doc.montant_paye || 0).toLocaleString("fr-FR")}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        Reste: {Math.max(0, Number(doc.montant_total) - Number(doc.montant_paye || 0)).toLocaleString("fr-FR")}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {doc.type === "facture" && Number(doc.montant_paye || 0) < Number(doc.montant_total) && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1 text-green-600 hover:bg-green-50 hover:text-green-700"
                                                        onClick={() => { setSelectedDoc(doc); setIsRecordPaymentOpen(true); }}
                                                    >
                                                        <Wallet className="h-4 w-4" />
                                                        Encaisser
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500" onClick={() => handleDeleteDocument(doc.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        Aucun document généré pour ce service.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddDocumentDialog
                isOpen={isAddDocumentOpen}
                onClose={() => setIsAddDocumentOpen(false)}
                onSuccess={() => { refetchDocs(); setIsAddDocumentOpen(false); }}
                serviceId={id!}
                serviceNom={service.nom}
                defaultType={documentType}
            />

            {selectedDoc && (
                <RecordPaymentDialog
                    isOpen={isRecordPaymentOpen}
                    onClose={() => { setIsRecordPaymentOpen(false); setSelectedDoc(null); }}
                    onSuccess={() => { refetchDocs(); setIsRecordPaymentOpen(false); setSelectedDoc(null); }}
                    documentId={selectedDoc.id}
                    clientNom={selectedDoc.client_nom}
                    totalAmount={Number(selectedDoc.montant_total)}
                    currentPaid={Number(selectedDoc.montant_paye || 0)}
                    serviceId={id!}
                    serviceNom={service.nom}
                />
            )}
        </div>
    );
};

export default ServiceDetails;

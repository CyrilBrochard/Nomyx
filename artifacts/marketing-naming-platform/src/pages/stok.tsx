import { useState } from "react";
import { useListStok, useDeleteStok, type StokSave, type ErrorType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Archive, Search, Trash2, Copy, CheckCheck, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Stok() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: saves = [], isLoading } = useListStok(
    debouncedQuery ? { q: debouncedQuery } : undefined
  );

  const { mutate: deleteSave } = useDeleteStok({
    mutation: {
      onSuccess() {
        queryClient.invalidateQueries({ queryKey: ["listStok"] });
        toast({ title: "Supprimé", description: "L'entrée StoK a été supprimée." });
        setConfirmDeleteId(null);
      },
      onError(err: ErrorType<unknown>) {
        const msg = (err.data as Record<string, string> | null)?.error ?? "Erreur lors de la suppression";
        toast({ title: "Erreur", description: msg, variant: "destructive" });
      },
    },
  });

  function handleSearch(val: string) {
    setQuery(val);
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => setDebouncedQuery(val), 300);
    setDebounceTimer(t);
  }

  async function copyResult(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function copyAll(save: StokSave) {
    const text = save.outputs.map((o) => `${o.outputCode}: ${o.result}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Copié", description: "Tous les résultats copiés dans le presse-papier." });
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">StoK</h1>
        <p className="text-muted-foreground mt-1">
          Retrouvez tous vos outputs enregistrés depuis le Générateur.
        </p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom…"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : saves.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Archive className="h-10 w-10 mx-auto mb-4 opacity-30" />
            {debouncedQuery ? (
              <p className="text-sm">Aucun résultat pour &laquo; {debouncedQuery} &raquo;</p>
            ) : (
              <>
                <p className="text-sm">Aucun output enregistré pour l'instant.</p>
                <p className="text-xs mt-1">
                  Générez des noms dans le Générateur et cliquez sur «&nbsp;Enregistrer dans StoK&nbsp;».
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {saves.map((save) => {
            const isExpanded = expandedId === save.id;
            return (
              <Card key={save.id} className="overflow-hidden">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{save.name}</span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {save.outputs.length} format{save.outputs.length > 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(save.createdAt instanceof Date ? save.createdAt.toISOString() : String(save.createdAt))}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => copyAll(save)}
                        title="Tout copier"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {confirmDeleteId === save.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-destructive hover:text-destructive"
                            onClick={() => deleteSave({ id: save.id })}
                          >
                            Oui
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Non
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setConfirmDeleteId(save.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={() => toggleExpand(save.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {save.outputs.slice(0, isExpanded ? save.outputs.length : 2).map((o) => (
                      <div
                        key={o.outputId}
                        className="flex items-center gap-1.5 bg-secondary/40 rounded-md px-2.5 py-1 group"
                      >
                        <Badge variant="outline" className="text-xs font-mono py-0 px-1.5">
                          {o.outputCode}
                        </Badge>
                        <span className="font-mono text-xs font-medium tracking-wide">{o.result}</span>
                        <button
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => copyResult(o.result, `${save.id}-${o.outputId}`)}
                          title="Copier"
                        >
                          {copiedKey === `${save.id}-${o.outputId}` ? (
                            <CheckCheck className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    ))}
                    {!isExpanded && save.outputs.length > 2 && (
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                        onClick={() => toggleExpand(save.id)}
                      >
                        +{save.outputs.length - 2} de plus
                      </button>
                    )}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

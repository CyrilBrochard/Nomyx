import {
  useListDimensions,
  useListOutputs,
  customFetch,
  type GeneratedOutput,
  type ErrorType,
} from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Wand2, Copy, RotateCcw, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface SelectionsMap {
  [dimId: number]: string;
}

export default function Generator() {
  const { data: dimensions = [], isLoading: dimsLoading } = useListDimensions();
  const { data: outputs = [] } = useListOutputs();
  const [selections, setSelections] = useState<SelectionsMap>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const { toast } = useToast();

  const enabledDimensions = dimensions.filter((d) => d.enabled);
  const allSelected = enabledDimensions.length > 0 && enabledDimensions.every((d) => selections[d.id]);
  const enabledOutputCount = outputs.filter((o) => o.enabled).length;

  const selectionsPayload: Record<string, number> = {};
  if (allSelected) {
    for (const [dimId, valId] of Object.entries(selections)) {
      if (valId) selectionsPayload[dimId] = Number(valId);
    }
  }

  const {
    data: generationResult,
    isLoading: isGenerating,
    refetch,
    isFetched,
  } = useQuery<{ outputs: GeneratedOutput[] }, ErrorType<unknown>>({
    queryKey: ["generate", selectionsPayload],
    queryFn: async () => {
      return customFetch<{ outputs: GeneratedOutput[] }>("/api/generate", {
        method: "POST",
        body: JSON.stringify({ selections: selectionsPayload }),
      });
    },
    enabled: allSelected && enabledOutputCount > 0,
    staleTime: 0,
  });

  const results = generationResult?.outputs ?? [];

  function setSelection(dimId: number, valueId: string) {
    setSelections((prev) => ({ ...prev, [dimId]: valueId }));
  }

  function clearAll() {
    setSelections({});
  }

  async function copyToClipboard(result: GeneratedOutput) {
    await navigator.clipboard.writeText(result.result);
    setCopiedId(result.outputId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function copyAll() {
    const text = results.map((r) => `${r.outputCode}: ${r.result}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "All outputs copied to clipboard" });
  }

  if (dimsLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Generator</h1>
        <p className="text-muted-foreground mt-1">
          Select values for each dimension — names generate automatically when all selections are made.
        </p>
      </div>

      {enabledDimensions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Wand2 className="h-10 w-10 mx-auto mb-4 opacity-30" />
            <p className="text-sm">No dimensions configured yet.</p>
            <p className="text-xs mt-1">Go to Dimensions to set up your naming structure.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Dimension Selections</CardTitle>
                <div className="flex items-center gap-2">
                  {!allSelected && enabledDimensions.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {enabledDimensions.filter((d) => !selections[d.id]).length} remaining
                    </span>
                  )}
                  {allSelected && isGenerating && (
                    <span className="text-xs text-primary animate-pulse">Generating…</span>
                  )}
                  <Button variant="outline" size="sm" onClick={clearAll} disabled={Object.keys(selections).length === 0}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {enabledDimensions.map((dim) => {
                  const enabledValues = dim.values.filter((v) => v.enabled);
                  return (
                    <div key={dim.id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">{dim.name}</label>
                        <span className="text-xs font-mono text-muted-foreground">[{dim.code}]</span>
                      </div>
                      <Select
                        value={selections[dim.id] ?? ""}
                        onValueChange={(v) => setSelection(dim.id, v)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a value…" />
                        </SelectTrigger>
                        <SelectContent>
                          {enabledValues.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">No values enabled</div>
                          ) : (
                            enabledValues.map((val) => (
                              <SelectItem key={val.id} value={String(val.id)}>
                                <span>{val.label}</span>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">{val.shortCode}</span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {allSelected && enabledOutputCount === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No output formats configured. Go to Outputs to add templates.
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Generated Outputs</CardTitle>
                  <Button variant="outline" size="sm" onClick={copyAll}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {results.map((r) => (
                  <div
                    key={r.outputId}
                    className="flex items-center justify-between rounded-lg border bg-secondary/30 px-4 py-3 group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-xs font-mono py-0">
                          {r.outputCode}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{r.outputName}</span>
                      </div>
                      <p className="font-mono text-sm font-medium tracking-wide truncate">{r.result}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => copyToClipboard(r)}
                    >
                      {copiedId === r.outputId ? (
                        <CheckCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

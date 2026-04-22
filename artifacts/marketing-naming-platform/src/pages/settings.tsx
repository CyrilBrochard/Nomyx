import { useRef, useState } from "react";
import {
  useGetMe,
  customFetch,
  type ErrorType,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, Settings2 } from "lucide-react";

function toastError(toast: ReturnType<typeof useToast>["toast"], err: ErrorType<unknown>) {
  const data = err.data as Record<string, string> | null;
  const msg = data?.error ?? err.message ?? "Something went wrong";
  toast({ title: "Error", description: msg, variant: "destructive" });
}

export default function Settings() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await customFetch<object>("/api/config/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `naming-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Config exported" });
    } catch (err) {
      toastError(toast, err as ErrorType<unknown>);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      await customFetch("/api/config/import", {
        method: "POST",
        body: JSON.stringify(json),
      });
      toast({ title: "Config imported", description: "Refresh the page to see changes." });
    } catch (err) {
      toastError(toast, err as ErrorType<unknown>);
    } finally {
      setIsImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your workspace configuration.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Team name</span>
              <span className="text-sm font-medium">{user?.teamName ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-t">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{user?.email ?? "—"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration Backup</CardTitle>
            <CardDescription>
              Export your dimensions and outputs as JSON, or import from a previous backup to replace current config.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" onClick={handleExport} disabled={isExporting} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? "Exporting…" : "Export config"}
            </Button>
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={isImporting}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? "Importing…" : "Import config"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

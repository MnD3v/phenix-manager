import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type PrintOptionChoice = {
  format: "a5" | "a4" | "custom";
  orientation: "portrait" | "landscape";
  copies: 1 | 2;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: PrintOptionChoice) => void;
};

export const PrintOptionsDialog: React.FC<Props> = ({ open, onOpenChange, onConfirm }) => {
  const [format, setFormat] = useState<PrintOptionChoice["format"]>("a4");
  const [orientation, setOrientation] = useState<PrintOptionChoice["orientation"]>("portrait");
  const [copies, setCopies] = useState<PrintOptionChoice["copies"]>(1);

  const handleConfirm = () => {
    onConfirm({ format, orientation, copies });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Options d'impression</DialogTitle>
          <DialogDescription>Choisissez le format et l'orientation avant d'imprimer.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="font-medium">Format</label>
            <div className="flex gap-3 mt-2">
              {/* <label className="inline-flex items-center gap-2">
                <input type="radio" name="format" value="a5" checked={format === "a5"} onChange={() => setFormat("a5")} />
                <span>A5 (148×210 mm)</span>
              </label> */}
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="format" value="a4" checked={format === "a4"} onChange={() => setFormat("a4")} />
                <span>A4 (210×297 mm)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-medium">Orientation</label>
            <div className="flex gap-3 mt-2">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="orientation" value="portrait" checked={orientation === "portrait"} onChange={() => setOrientation("portrait")} />
                <span>Portrait</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="orientation" value="landscape" checked={orientation === "landscape"} onChange={() => setOrientation("landscape")} />
                <span>Paysage</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-medium">Nombre d'exemplaires</label>
            <div className="flex gap-3 mt-2">
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="copies" value="1" checked={copies === 1} onChange={() => setCopies(1)} />
                <span>1 exemplaire</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="radio" name="copies" value="2" checked={copies === 2} onChange={() => setCopies(2)} />
                <span>2 exemplaires (coupé)</span>
              </label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleConfirm}>Imprimer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PrintOptionsDialog;

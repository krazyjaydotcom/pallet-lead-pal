import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lead } from "@/types/Lead";

interface LTVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
  onSave: (lead: Lead) => void;
}

export const LTVDialog: React.FC<LTVDialogProps> = ({
  open,
  onOpenChange,
  lead,
  onSave
}) => {
  const [ltvData, setLtvData] = useState({
    palletsPerMonth: lead.ltvData?.palletsPerMonth || null,
    palletType: lead.ltvData?.palletType || 'standard' as 'standard' | 'custom',
    pricePerPallet: lead.ltvData?.pricePerPallet || null,
    notSure: lead.ltvData?.notSure || false
  });

  const calculateLTV = (pallets: number, price: number) => {
    const monthly = pallets * price;
    return {
      thirtyDay: monthly,
      threeMonth: monthly * 3,
      sixMonth: monthly * 6,
      twelveMonth: monthly * 12
    };
  };

  const handleSave = () => {
    const updatedLead = {
      ...lead,
      currentCustomer: true,
      ltvData: ltvData.notSure ? { ...ltvData } : ltvData
    };
    onSave(updatedLead);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Revert currentCustomer to false since they cancelled
    const updatedLead = {
      ...lead,
      currentCustomer: false
    };
    onSave(updatedLead);
    onOpenChange(false);
  };

  const ltv = ltvData.palletsPerMonth && ltvData.pricePerPallet && !ltvData.notSure
    ? calculateLTV(ltvData.palletsPerMonth, ltvData.pricePerPallet)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customer LTV Configuration</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pallets-per-month">Pallets per Month</Label>
            <Input
              id="pallets-per-month"
              type="number"
              placeholder="e.g., 50"
              value={ltvData.palletsPerMonth || ''}
              onChange={(e) => setLtvData({
                ...ltvData,
                palletsPerMonth: e.target.value ? parseInt(e.target.value) : null
              })}
              disabled={ltvData.notSure}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pallet-type">Pallet Type</Label>
            <Select
              value={ltvData.palletType}
              onValueChange={(value) => setLtvData({
                ...ltvData,
                palletType: value as 'standard' | 'custom'
              })}
              disabled={ltvData.notSure}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price-per-pallet">Price per Pallet ($)</Label>
            <Input
              id="price-per-pallet"
              type="number"
              step="0.01"
              placeholder="e.g., 25.00"
              value={ltvData.pricePerPallet || ''}
              onChange={(e) => setLtvData({
                ...ltvData,
                pricePerPallet: e.target.value ? parseFloat(e.target.value) : null
              })}
              disabled={ltvData.notSure}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="not-sure"
              checked={ltvData.notSure}
              onCheckedChange={(checked) => setLtvData({
                ...ltvData,
                notSure: !!checked
              })}
            />
            <Label htmlFor="not-sure">Not sure about the details</Label>
          </div>

          {ltv && !ltvData.notSure && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>30 Day Value:</span>
                  <span className="font-medium">${ltv.thirtyDay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>3 Month Value:</span>
                  <span className="font-medium">${ltv.threeMonth.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>6 Month Value:</span>
                  <span className="font-medium">${ltv.sixMonth.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>12 Month Value:</span>
                  <span>${ltv.twelveMonth.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {ltvData.notSure && (
            <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Customer marked as current but LTV details are unknown. You can update this information later.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Customer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
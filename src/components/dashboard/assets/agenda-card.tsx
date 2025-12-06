
"use client";

import { MapPin, Users, Clock, Car, Truck, Building2, Package, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { AssetBooking } from "@/lib/types";

interface AgendaCardProps {
  booking: AssetBooking;
  onClick?: () => void;
}

export function AgendaCard({ booking, onClick }: AgendaCardProps) {
  // Determine icon and color based on asset name/context (since we don't have explicit type on booking, we infer or default)
  // Ideally, we would join with Asset data, but for now we'll simulate based on common patterns or just use a default "Booking" style.
  
  const isVehicle = booking.assetName.toLowerCase().includes('patrol') || booking.assetName.toLowerCase().includes('truck') || booking.assetName.toLowerCase().includes('ambulance');
  const isFacility = booking.assetName.toLowerCase().includes('hall') || booking.assetName.toLowerCase().includes('court') || booking.assetName.toLowerCase().includes('center');

  let Icon = Package;
  let colorClass = "bg-purple-100 text-purple-700 border-purple-200";
  let typeLabel = "Equipment";

  if (isVehicle) {
    Icon = Car;
    colorClass = "bg-blue-100 text-blue-700 border-blue-200";
    typeLabel = "Vehicle Dispatch";
  } else if (isFacility) {
    Icon = Building2;
    colorClass = "bg-green-100 text-green-700 border-green-200";
    typeLabel = "Facility Use";
  }

  // Check status for styling
  if (booking.status === 'Pending') {
    colorClass = "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  return (
    <Card 
      className={`flex flex-col gap-3 p-4 border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${colorClass.replace('bg-', 'border-l-')}`}
      onClick={onClick}
    >
      
      {/* Header: Time & Status */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
          <Clock className="w-4 h-4" />
          <span>
            {format(new Date(booking.startDateTime), 'h:mm a')} - {format(new Date(booking.endDateTime), 'h:mm a')}
          </span>
        </div>
        <Badge variant="outline" className={`${colorClass} border`}>
          {booking.status.toUpperCase()}
        </Badge>
      </div>

      {/* Title */}
      <div>
        <h4 className="font-bold text-slate-900 text-lg leading-tight">
          {booking.purpose}
        </h4>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          {booking.assetName}
        </p>
      </div>

      {/* Footer: Borrower & Details */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {booking.borrowerName}
        </div>
        <div className="flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {typeLabel}
        </div>
      </div>
    </Card>
  );
}


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { User as Official } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditOfficial, DeleteOfficial } from "./officials-actions";
import { Briefcase, Users, Calendar, CheckSquare } from "lucide-react";

type OfficialCardProps = { 
    official: Official;
    onEdit: (official: Official) => void;
    onDelete: (id: string, name: string) => void;
    positions: string[];
    committees: string[];
    systemRoles: string[];
};

const getSystemRoleBadgeVariant = (role: string) => {
  switch (role) {
    case "Super Admin":
      return "destructive";
    case "Admin":
      return "default";
    case "Encoder":
    case "Responder":
      return "secondary";
    default:
      return "outline";
  }
};

export function OfficialCard({ 
    official,
    onEdit,
    onDelete,
    positions,
    committees,
    systemRoles,
 }: OfficialCardProps) {

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={`https://i.pravatar.cc/150?u=${official.userId}`} alt={official.fullName} />
          <AvatarFallback>{official.fullName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="text-lg">{official.fullName}</CardTitle>
          <CardDescription>@{official.email?.split('@')[0] || 'user'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-grow">
        <div className="flex items-start gap-2">
            <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
                <p className="text-sm font-semibold">{official.position}</p>
                <p className="text-xs text-muted-foreground">Official Position</p>
            </div>
        </div>
        {official.committee && (
             <div className="flex items-start gap-2">
                <Users className="h-4 w-4 mt-1 text-muted-foreground" />
                <div>
                    <p className="text-sm font-semibold">{official.committee}</p>
                    <p className="text-xs text-muted-foreground">Committee</p>
                </div>
            </div>
        )}
         <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
            <div>
                <p className="text-sm font-semibold">{official.termStart || 'N/A'} to {official.termEnd || 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Term of Service</p>
            </div>
        </div>
      </CardContent>
       <CardFooter className="flex-col items-start p-4 mt-auto border-t">
        <div className="flex justify-between items-center w-full mb-4">
             <div className="flex items-center gap-2">
                 <CheckSquare className="h-4 w-4 text-muted-foreground" />
                 <Badge variant={getSystemRoleBadgeVariant(official.systemRole)}>{official.systemRole}</Badge>
            </div>
             <p className="text-xs text-muted-foreground">ID: ...{official.userId ? official.userId.slice(-6) : '???'}</p>
        </div>
        <div className="flex justify-end gap-2 w-full">
            <EditOfficial 
                record={official} 
                onEdit={onEdit} 
                positions={positions} 
                committees={committees} 
                systemRoles={systemRoles} 
            />
            <DeleteOfficial recordId={official.userId} recordName={official.fullName} onDelete={onDelete} />
        </div>
      </CardFooter>
    </Card>
  );
}

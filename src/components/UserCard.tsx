import { Database } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { User, Phone, MapPin, Star, ChevronRight, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

type AppUser = Database["public"]["Tables"]["users"]["Row"];

interface UserCardProps {
  user: AppUser;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function UserCard({ user, onEdit, onDelete }: UserCardProps) {
  const navigate = useNavigate();

  return (
    <div
      className="group dashboard-card relative overflow-hidden cursor-pointer"
      onClick={() => navigate(`/user/${user.id}`)}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.03), hsl(var(--primary) / 0.08))'
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="icon-container group-hover:animate-float">
            <User className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-1">
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  title="Edit user"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg hover:bg-info/10 hover:text-info"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/user/${user.id}`);
                  }}
                  title="View full admin details"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-10 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" />
          </div>
        </div>
        <h3 className="font-bold text-foreground text-lg">{user.name}</h3>
        {user.phone && (
          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {user.phone}
          </div>
        )}
        {user.address && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {user.address}
          </div>
        )}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/50">
          <Star className="h-4 w-4 text-warning" />
          <span className="font-bold gradient-text">{user.points}</span>
          <span className="text-sm text-muted-foreground">points</span>
        </div>
      </div>
    </div>
  );
}
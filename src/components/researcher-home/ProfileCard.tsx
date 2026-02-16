import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, FlaskConical, ExternalLink } from 'lucide-react';

interface ProfileCardProps {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  institution: string | null;
  orcid: string | null;
  onEditProfile: () => void;
}

export default function ProfileCard({
  userId,
  fullName,
  email,
  avatarUrl,
  institution,
  orcid,
  onEditProfile,
}: ProfileCardProps) {
  const navigate = useNavigate();
  const displayName = fullName || 'Researcher';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 p-6 md:flex-col lg:flex-col">
        {/* Avatar */}
        <Avatar className="h-20 w-20">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-[hsl(var(--deep-blue))] text-[hsl(var(--deep-blue-foreground))] text-xl font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-xl font-bold text-foreground font-serif">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{email}</p>
          {institution && (
            <p className="text-sm text-muted-foreground">{institution}</p>
          )}
          {orcid && (
            <Badge variant="outline" className="mt-1 gap-1 text-xs font-normal">
              <span className="font-semibold">ORCID</span>
              {orcid}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex w-full flex-col gap-2">
          <Button variant="outline" size="sm" className="w-full" onClick={onEditProfile}>
            <User className="mr-1.5 h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/digital-lab')}
          >
            <FlaskConical className="mr-1.5 h-4 w-4" />
            Digital Lab
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => navigate(`/profile/${userId}`)}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            View Public Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

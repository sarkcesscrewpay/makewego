// client/src/components/FavoriteButton.tsx
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites, type FavoriteRoute } from '@/hooks/use-favorites';
import { useToast } from '@/hooks/use-toast';

interface FavoriteButtonProps {
  route: {
    _id: string;
    name: string;
    startLocation: string;
    endLocation: string;
  };
  size?: 'sm' | 'default' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export default function FavoriteButton({
  route,
  size = 'icon',
  variant = 'ghost',
  showLabel = false,
}: FavoriteButtonProps) {
  const { toast } = useToast();
  const { isFavorite, toggleFavorite } = useFavorites();

  const isRoutefavorite = isFavorite(route._id);

  const handleToggle = async () => {
    const item: Omit<FavoriteRoute, 'createdAt'> = {
      id: route._id,
      type: 'route',
      name: route.name,
      data: {
        startLocation: route.startLocation,
        endLocation: route.endLocation,
      },
    };

    const success = await toggleFavorite(item);

    if (success) {
      toast({
        title: isRoutefavorite ? 'Removed from Favorites' : 'Added to Favorites',
        description: isRoutefavorite
          ? `${route.name} removed from your favorites`
          : `${route.name} added to your favorites`,
      });
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      className={isRoutefavorite ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-red-500'}
    >
      <Heart
        className={`h-5 w-5 ${isRoutefavorite ? 'fill-current' : ''}`}
      />
      {showLabel && (
        <span className="ml-2">
          {isRoutefavorite ? 'Remove Favorite' : 'Add Favorite'}
        </span>
      )}
    </Button>
  );
}

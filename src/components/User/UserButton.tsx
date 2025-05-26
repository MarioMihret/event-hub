"use client";

import { FC, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Settings, UserIcon, LogOut } from "lucide-react";

import { UserAvatar } from "./UserAvatar";
import { UserInfo } from "./UserInfo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserButtonProps {
  size?: "sm" | "md" | "lg";
  showBorder?: boolean;
}

export const UserButton: FC<UserButtonProps> = ({ 
  size = "md", 
  showBorder = true 
}) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.button
          className="rounded-full focus:outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <UserAvatar 
            user={session.user} 
            size={size} 
            showBorder={showBorder}
            isActive={isOpen}
          />
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        <div className="flex flex-col gap-2 p-2">
          <UserInfo 
            user={session.user} 
            variant="compact" 
            showBio={false} 
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/profile')}
        >
          <UserIcon className="h-4 w-4 text-[#b967ff]" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => router.push('/settings')}
        >
          <Settings className="h-4 w-4 text-[#b967ff]" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer text-red-500"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}; 
import { Calendar, Users, Building2 } from "lucide-react";
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "../contexts/UserContext";

interface AppSidebarProps {
    onNavigate: (view: "schedule" | "workers" | "clinics") => void;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
    const { setOpen } = useSidebar();
    const { user } = useUser();
    const handleNavigation = (view: "schedule" | "workers" | "clinics") => {
        onNavigate(view);
        setOpen(false);
    };

    return (
        <Sidebar>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => handleNavigation("schedule")}
                                >
                                    <Calendar />
                                    <span>Schedule</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                            {user?.isAdmin && (
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        onClick={() =>
                                            handleNavigation("workers")
                                        }
                                    >
                                        <Users />
                                        <span>Workers</span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            )}
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    onClick={() => handleNavigation("clinics")}
                                >
                                    <Building2 />
                                    <span>Clinics</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

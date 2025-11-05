import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Clinic } from "./Clinics";
import { DeleteClinicButton } from "./DeleteClinicButton";
import { ShiftsDisplay } from "./ShiftsDisplay";
import { Button } from "../ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface OrgClinicsDisplayProps {
    clinics: Clinic[];
}

export const OrgClinicsDisplay = ({ clinics }: OrgClinicsDisplayProps) => {
    const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);

    const toggleShifts = (clinicId: string) => {
        setExpandedClinicId(expandedClinicId === clinicId ? null : clinicId);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Clinics</CardTitle>
            </CardHeader>
            <CardContent>
                {clinics.length === 0 ? (
                    <p className="text-muted-foreground">
                        No clinics added yet.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {clinics.map((clinic) => (
                            <div key={clinic.id} className="border rounded-lg">
                                <div className="p-4 flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{clinic.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                            {clinic.location}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleShifts(clinic.id)}
                                        >
                                            {expandedClinicId === clinic.id ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4 mr-1" />
                                                    Hide Shifts
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4 mr-1" />
                                                    View Shifts
                                                </>
                                            )}
                                        </Button>
                                        <DeleteClinicButton
                                            clinicId={clinic.id}
                                            clinicName={clinic.name}
                                        />
                                    </div>
                                </div>
                                {expandedClinicId === clinic.id && (
                                    <div className="px-4 pb-4 border-t">
                                        <ShiftsDisplay clinicId={clinic.id} isAdmin={true} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

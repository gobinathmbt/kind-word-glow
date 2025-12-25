import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vehicleServices } from '@/api/services';
import { format } from 'date-fns';
import {
    Activity,
    User,
    Clock,
    FileText,
    PlusCircle,
    Edit,
    Trash2,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Car,
    Settings,
    Image,
    Wrench,
    Clipboard,
    MapPin,
    Calendar,
    CheckCircle,
    AlertCircle,
    Info,
    Upload,
    Download,
    Zap,
    Database,
    Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface ActivityStreamSectionProps {
    vehicleType: string;
    stockId: string | number;
}

interface FieldGroup {
    fieldName: string;
    fieldIcon: string;
    displayName: string;
    changes: Array<{
        timestamp: Date;
        oldValue: any;
        newValue: any;
        userName: string;
        userId: string;
        moduleName: string;
        action: string;
        actionType?: 'add' | 'remove' | 'update';
    }>;
}

interface SectionGroup {
    sectionName: string;
    sectionIcon: string;
    fields: Record<string, FieldGroup>;
}

const ActivityStreamSection: React.FC<ActivityStreamSectionProps> = ({ vehicleType, stockId }) => {
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [groupBy, setGroupBy] = useState<'chronological' | 'field'>('field');

    const { data: response, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['vehicle-activity', vehicleType, stockId, currentPage, pageSize],
        queryFn: async () => {
            const result = await vehicleServices.getActivityLogs(vehicleType, stockId, {
                page: currentPage,
                limit: pageSize
            });
            return result.data;
        },
        staleTime: 0,
        refetchOnWindowFocus: true
    });

    const logs = response?.data || [];
    const pagination = response?.pagination;

    // Helper functions for grouping
    const getSectionInfo = (moduleName: string) => {
        const sectionMap: Record<string, { name: string }> = {
            'Vehicle Overview': { name: 'Vehicle Overview' },
            'Vehicle General Info': { name: 'Vehicle General Info' },
            'Vehicle Specifications': { name: 'Vehicle Specifications' },
            'Vehicle Attachments': { name: 'Vehicle Attachments' },
            'Vehicle Odometer': { name: 'Vehicle Odometer' },
            'Vehicle Source': { name: 'Vehicle Source' },
            'Vehicle Registration': { name: 'Vehicle Registration' },
            'Vehicle Engine': { name: 'Vehicle Engine' },
            'Vehicle Ownership': { name: 'Vehicle Ownership' }
        };
        return sectionMap[moduleName] || { name: moduleName };
    };

    const formatFieldName = (fieldName: string) => {
        return fieldName
            .replace(/_/g, ' ')
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Group logs by section and field
    const groupedLogs = useMemo(() => {
        if (groupBy === 'chronological') return null;

        const grouped: Record<string, SectionGroup> = {};

        logs.forEach((log: any) => {
            const sectionInfo = getSectionInfo(log.module_name);

            // Initialize section if not exists
            if (!grouped[log.module_name]) {
                grouped[log.module_name] = {
                    sectionName: sectionInfo.name,
                    sectionIcon: '',
                    fields: {}
                };
            }

            // Process each change in the log
            log.changes?.forEach((change: any) => {
                const fieldKey = change.field;

                // Filter out system fields
                if (['_id', 'id', '__v', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(fieldKey)) {
                    return;
                }

                // Initialize field if not exists
                if (!grouped[log.module_name].fields[fieldKey]) {
                    grouped[log.module_name].fields[fieldKey] = {
                        fieldName: fieldKey,
                        fieldIcon: '',
                        displayName: formatFieldName(fieldKey),
                        changes: []
                    };
                }

                // Add change to field history
                grouped[log.module_name].fields[fieldKey].changes.push({
                    timestamp: new Date(log.timestamp),
                    oldValue: change.old_value,
                    newValue: change.new_value,
                    userName: log.user_name,
                    userId: log.user_id,
                    moduleName: log.module_name,
                    action: log.action,
                    actionType: change.action_type
                });
            });
        });

        // Sort changes within each field chronologically (newest first)
        Object.values(grouped).forEach(section => {
            Object.values(section.fields).forEach(field => {
                field.changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
            });
        });

        return grouped;
    }, [logs, groupBy]);

    const handleRefresh = () => {
        refetch();
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handlePageSizeChange = (size: number) => {
        setPageSize(size);
        setCurrentPage(1); // Reset to first page when changing page size
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity Stream
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        <p className="text-lg font-medium">Loading activity stream...</p>
                        <p className="text-sm">Fetching recent changes and updates</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        console.error('Activity logs error:', error);
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Stream
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <Activity className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-700 mb-2">Unable to Load Activity</h3>
                        <p className="text-red-600 mb-4 max-w-sm">
                            {error.message || 'There was an error loading the activity stream.'}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Activity Stream
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center p-12 text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
                            <Activity className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No Activity Yet</h3>
                        <p className="text-muted-foreground max-w-sm">
                            Vehicle changes and updates will appear here. Start by editing vehicle information to see activity logs.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getModuleIcon = (moduleName: string, action: string) => {
        const iconClass = "h-5 w-5 text-white";

        switch (moduleName.toLowerCase()) {
            case 'vehicle overview':
            case 'vehicle general info':
                return <Car className={iconClass} />;
            case 'vehicle specifications':
                return <Settings className={iconClass} />;
            case 'vehicle attachments':
                return action === 'create' ? <Upload className={iconClass} /> :
                    action === 'delete' ? <Trash2 className={iconClass} /> : <Image className={iconClass} />;
            case 'vehicle engine':
            case 'vehicle eng transmission':
                return <Zap className={iconClass} />;
            case 'vehicle source':
                return <Database className={iconClass} />;
            case 'vehicle registration':
                return <Shield className={iconClass} />;
            case 'vehicle odometer':
                return <Clipboard className={iconClass} />;
            case 'vehicle ownership':
                return <User className={iconClass} />;
            case 'vehicle import':
                return <Download className={iconClass} />;
            default:
                return action === 'create' ? <PlusCircle className={iconClass} /> :
                    action === 'update' ? <Edit className={iconClass} /> :
                        action === 'delete' ? <Trash2 className={iconClass} /> :
                            <FileText className={iconClass} />;
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'create': return 'bg-green-500';
            case 'update': return 'bg-blue-500';
            case 'delete': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const getActionText = (action: string) => {
        switch (action) {
            case 'create': return 'Created';
            case 'update': return 'Updated';
            case 'delete': return 'Deleted';
            default: return 'Modified';
        }
    };

    const renderChangeValue = (val: any) => {
        if (val === null || val === undefined || val === '') return <span className="text-muted-foreground italic text-[10px]">empty</span>;

        // Handle Boolean
        if (typeof val === 'boolean') {
            return <span className="text-[10px]">{val ? 'Yes' : 'No'}</span>;
        }

        // Handle Date string (ISO format check is loose but practical)
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
            try {
                return <span className="text-[10px]">{format(new Date(val), 'MMM d, yyyy')}</span>;
            } catch (e) {
                return <span className="text-[10px]">{val}</span>;
            }
        }

        // Handle Array or Object
        if (typeof val === 'object') {
            // If Array
            if (Array.isArray(val)) {
                if (val.length === 0) return <span className="text-muted-foreground italic text-[10px]">[]</span>;

                return (
                    <div className="flex flex-col gap-0.5 my-0.5">
                        {val.map((item, idx) => (
                            <div key={idx} className="border-l border-primary/20 pl-1 ml-0.5 text-[10px]">
                                {renderChangeValue(item)}
                            </div>
                        ))}
                    </div>
                );
            }

            // If Object
            // Filter out internal fields like _id
            const keys = Object.keys(val).filter(k => !['_id', 'createdAt', 'updatedAt', 'id', 'created_at', 'updated_at', '__v', 'timestamp'].includes(k));

            if (keys.length === 0) return <span className="text-[10px]">{JSON.stringify(val)}</span>;

            return (
                <div className="flex flex-col gap-0.5 text-[10px] my-0.5">
                    {keys.map(k => (
                        <div key={k} className="grid grid-cols-[auto_1fr] gap-1 items-start">
                            <span className="font-semibold text-muted-foreground/80 capitalize text-[10px]">{k.replace(/_/g, ' ')}:</span>
                            <span className="truncate text-[10px]">{renderChangeValue(val[k])}</span>
                        </div>
                    ))}
                </div>
            );
        }

        return <span className="text-[10px]">{String(val)}</span>;
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Activity Stream
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Select value={groupBy} onValueChange={(value: 'chronological' | 'field') => setGroupBy(value)}>
                            <SelectTrigger className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="field">Group by Field</SelectItem>
                                <SelectItem value="chronological">Chronological</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={isFetching}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {groupBy === 'field' && groupedLogs ? (
                    // Grouped by Field View - Compact Professional Design
                    <div className="space-y-2">
                        {Object.entries(groupedLogs).map(([sectionKey, section]) => (
                            <Accordion key={sectionKey} type="single" collapsible defaultValue={sectionKey}>
                                <AccordionItem value={sectionKey} className="border rounded-md bg-card">
                                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                                        <div className="flex items-center gap-3 w-full">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor('update')}`}>
                                                {getModuleIcon(section.sectionName, 'update')}
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h3 className="text-base font-semibold text-foreground">{section.sectionName}</h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {Object.keys(section.fields).length} field{Object.keys(section.fields).length !== 1 ? 's' : ''} modified
                                                </p>
                                            </div>
                                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                                {Object.keys(section.fields).length} fields
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-4 pb-3">
                                        <div className="space-y-2">
                                            {Object.entries(section.fields).map(([fieldKey, field]) => (
                                                <div key={fieldKey} className="bg-muted/20 rounded-md p-3 border-l-2 border-primary/30">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-3 w-3 text-primary" />
                                                            <h4 className="text-sm font-medium text-foreground">{field.displayName}</h4>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                                            {field.changes.length}
                                                        </Badge>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {field.changes.map((change, idx) => (
                                                            <div key={idx} className="bg-background rounded-md p-2">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <User className="h-4 w-4" />
                                                                        <span>{change.userName}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                                        <Clock className="h-4 w-4" />
                                                                        <span>{format(change.timestamp, 'MMM d, h:mm a')}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="text-sm">
                                                                    {change.actionType === 'add' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-green-600 font-medium">Added:</span>
                                                                            <span className="text-green-700 bg-green-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.newValue)}
                                                                            </span>
                                                                        </div>
                                                                    ) : change.actionType === 'remove' ? (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-red-600 font-medium">Removed:</span>
                                                                            <span className="text-red-700 bg-red-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.oldValue)}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.oldValue)}
                                                                            </span>
                                                                            <span className="text-muted-foreground">→</span>
                                                                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.newValue)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        ))}
                    </div>
                ) : (
                    // Chronological View - Compact Professional Design
                    <div className="space-y-3">
                        {logs.map((log: any) => {
                            // Group changes by parent field
                            const groupedChanges: Record<string, typeof log.changes> = {};
                            const rootChanges: typeof log.changes = [];

                            if (log.changes) {
                                log.changes.forEach((change: any) => {
                                    // Filter out system fields
                                    if (['_id', 'id', '__v', 'createdAt', 'updatedAt', 'created_at', 'updated_at'].includes(change.field)) {
                                        return;
                                    }

                                    if (change.field.includes('.')) {
                                        const [parent, ...rest] = change.field.split('.');
                                        const childField = rest.join('.');
                                        if (!groupedChanges[parent]) groupedChanges[parent] = [];
                                        groupedChanges[parent].push({ ...change, field: childField });
                                    } else {
                                        rootChanges.push(change);
                                    }
                                });
                            }

                            return (
                                <div key={log._id} className="flex gap-3 group hover:bg-muted/20 p-3 rounded-md transition-colors">
                                    {/* Timeline Icon */}
                                    <div className="flex-shrink-0">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor(log.action)}`}>
                                            {getModuleIcon(log.module_name, log.action)}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-base font-semibold text-foreground">
                                                        {log.module_name}
                                                    </h3>
                                                    <Badge
                                                        variant={log.action === 'create' ? 'default' :
                                                            log.action === 'delete' ? 'destructive' : 'secondary'}
                                                        className="text-xs px-1.5 py-0.5"
                                                    >
                                                        {getActionText(log.action)}
                                                    </Badge>
                                                </div>

                                                {/* User and timestamp */}
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        <span>{log.user_name || 'System'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-4 w-4" />
                                                        <span>{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Changes */}
                                        {(rootChanges.length > 0 || Object.keys(groupedChanges).length > 0) && (
                                            <div className="mt-2 space-y-2">
                                                {/* Root Level Changes */}
                                                {rootChanges.map((change: any, i: number) => (
                                                    <div key={i} className="bg-muted/30 rounded-md p-2 border-l-2 border-primary/30">
                                                        <div className="flex items-start gap-2">
                                                            <FileText className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                                            <div className="flex-1">
                                                                <div className="text-sm font-medium text-foreground mb-1">
                                                                    {change.field.replace(/_/g, ' ').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()}
                                                                </div>
                                                                <div className="text-sm">
                                                                    {change.action_type === 'add' ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-green-600 font-medium">Added:</span>
                                                                            <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                                                                {renderChangeValue(change.new_value)}
                                                                            </span>
                                                                        </div>
                                                                    ) : change.action_type === 'remove' ? (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-red-600 font-medium">Removed:</span>
                                                                            <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                                                                {renderChangeValue(change.old_value)}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-1 flex-wrap">
                                                                            <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.old_value)}
                                                                            </span>
                                                                            <span className="text-muted-foreground">→</span>
                                                                            <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                                                                                {renderChangeValue(change.new_value)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Nested Groups */}
                                                {Object.entries(groupedChanges).map(([parentField, changes]: [string, any[]]) => (
                                                    <div key={parentField} className="bg-muted/30 rounded-md p-2 border-l-2 border-primary/30">
                                                        <div className="flex items-center gap-1 text-sm font-medium text-foreground mb-1">
                                                            <Settings className="h-4 w-4 text-primary" />
                                                            {parentField.replace(/_/g, ' ')}
                                                        </div>
                                                        <div className="ml-4 space-y-1">
                                                            {changes.map((change: any, i: number) => (
                                                                <div key={i} className="text-sm">
                                                                    <div className="font-medium text-foreground mb-0.5">
                                                                        {change.field.replace(/_/g, ' ').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim()}
                                                                    </div>
                                                                    <div>
                                                                        {change.action_type === 'add' ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-green-600 font-medium">Added:</span>
                                                                                <span className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                                                                                    {renderChangeValue(change.new_value)}
                                                                                </span>
                                                                            </div>
                                                                        ) : change.action_type === 'remove' ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <span className="text-red-600 font-medium">Removed:</span>
                                                                                <span className="text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                                                                                    {renderChangeValue(change.old_value)}
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex items-center gap-1 flex-wrap">
                                                                                <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                                                                    {renderChangeValue(change.old_value)}
                                                                                </span>
                                                                                <span className="text-muted-foreground">→</span>
                                                                                <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                                                                    {renderChangeValue(change.new_value)}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {pagination && pagination.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>
                                Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                {Math.min(pagination.current_page * pagination.per_page, pagination.total_records)} of{' '}
                                {pagination.total_records} entries
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.current_page - 1)}
                                disabled={!pagination.has_prev || isFetching}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>

                            <span className="text-sm px-2">
                                Page {pagination.current_page} of {pagination.total_pages}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.current_page + 1)}
                                disabled={!pagination.has_next || isFetching}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ActivityStreamSection;

import React, { useEffect, useState } from "react";
import { useMaintenanceStore } from "@/store/maintenanceStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Wrench,
  Clock,
  AlertTriangle,
  RefreshCw,
  Home,
  Calendar,
} from "lucide-react";
import DashboardLayout from "../layout/DashboardLayout";

interface MaintenancePageProps {
  type: "website" | "module";
  moduleName?: string;
  onRetry?: () => void;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({
  type,
  moduleName,
  onRetry,
}) => {
  const { getMaintenanceMessage, getMaintenanceEndTime } =
    useMaintenanceStore();
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  const message = getMaintenanceMessage(moduleName);
  const endTime = getMaintenanceEndTime(moduleName);

  useEffect(() => {
    if (!endTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(endTime);
      const total = end.getTime() - now.getTime();

      if (total <= 0) {
        setTimeLeft("Maintenance should be completed");
        setProgress(100);
        return;
      }

      // Calculate time components
      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((total % (1000 * 60)) / 1000);

      // Format time string
      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setTimeLeft(timeString.trim());

      // Calculate progress (assuming maintenance started some time ago)
      // For now, we'll show a pulsing progress
      const pulseProgress = 30 + Math.sin(Date.now() / 1000) * 20;
      setProgress(pulseProgress);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  const handleGoHome = () => {
    window.location.href = "/";
  };

  const isWebsiteMaintenance = type === "website";
  const title = isWebsiteMaintenance
    ? "Website Under Maintenance"
    : `${moduleName
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase())} Module Under Maintenance`;

  return (
    <>
      {isWebsiteMaintenance ? (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-6 relative">
                  <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Wrench className="w-12 h-12 text-orange-500 animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-800" />
                  </div>
                </div>

                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </CardTitle>

                <div className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {message}
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Progress Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Maintenance Progress</span>
                    <span>In Progress...</span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-3 bg-gray-200 dark:bg-gray-700"
                  />
                </div>

                {/* Time Information */}
                {endTime && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            Estimated completion:
                          </span>
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 font-mono">
                          {timeLeft || "Calculating..."}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Expected end: {new Date(endTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* What's happening */}
                <Card className="bg-gray-50 dark:bg-gray-800/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      What's happening?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          We're performing scheduled maintenance to improve your
                          experience
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          All your data is safe and will be available when
                          maintenance is complete
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          We appreciate your patience during this time
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {onRetry && (
                    <Button
                      onClick={onRetry}
                      variant="outline"
                      className="flex items-center space-x-2 w-full sm:w-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Try Again</span>
                    </Button>
                  )}

                  {!isWebsiteMaintenance && (
                    <Button
                      onClick={handleGoHome}
                      className="flex items-center space-x-2 w-full sm:w-auto"
                    >
                      <Home className="w-4 h-4" />
                      <span>Go to Home</span>
                    </Button>
                  )}
                </div>

                {/* Contact Information */}
                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Need immediate assistance? Contact our support team
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    support@autoErp.com
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>{" "}
        </div>
      ) : (
        <DashboardLayout title="Maintence">
          <div className="w-full max-w-8xl">
            <Card className="shadow-2xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto mb-6 relative">
                  <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Wrench className="w-12 h-12 text-orange-500 animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-800" />
                  </div>
                </div>

                <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {title}
                </CardTitle>

                <div className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
                  {message}
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Progress Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Maintenance Progress</span>
                    <span>In Progress...</span>
                  </div>
                  <Progress
                    value={progress}
                    className="h-3 bg-gray-200 dark:bg-gray-700"
                  />
                </div>

                {/* Time Information */}
                {endTime && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-blue-900 dark:text-blue-100">
                            Estimated completion:
                          </span>
                        </div>
                        <div className="text-blue-700 dark:text-blue-300 font-mono">
                          {timeLeft || "Calculating..."}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Expected end: {new Date(endTime).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* What's happening */}
                <Card className="bg-gray-50 dark:bg-gray-800/50">
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      What's happening?
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          We're performing scheduled maintenance to improve your
                          experience
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          All your data is safe and will be available when
                          maintenance is complete
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span>
                          We appreciate your patience during this time
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  {onRetry && (
                    <Button
                      onClick={onRetry}
                      variant="outline"
                      className="flex items-center space-x-2 w-full sm:w-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Try Again</span>
                    </Button>
                  )}
                </div>

                {/* Contact Information */}
                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Need immediate assistance? Contact our support team
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                    support@autoErp
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      )}
    </>
  );
};

export default MaintenancePage;

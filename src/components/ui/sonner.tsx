import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-muted/80",
          success:
            "group-[.toaster]:!bg-green-600 dark:group-[.toaster]:!bg-green-700 group-[.toaster]:!text-white group-[.toaster]:!border-green-700 dark:group-[.toaster]:!border-green-600",
          error:
            "group-[.toaster]:!bg-red-600 dark:group-[.toaster]:!bg-red-700 group-[.toaster]:!text-white group-[.toaster]:!border-red-700 dark:group-[.toaster]:!border-red-600",
          warning:
            "group-[.toaster]:!bg-yellow-600 dark:group-[.toaster]:!bg-yellow-700 group-[.toaster]:!text-white group-[.toaster]:!border-yellow-700 dark:group-[.toaster]:!border-yellow-600",
          info:
            "group-[.toaster]:!bg-blue-600 dark:group-[.toaster]:!bg-blue-700 group-[.toaster]:!text-white group-[.toaster]:!border-blue-700 dark:group-[.toaster]:!border-blue-600",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentPropsWithoutRef<"nav">) => (
  <nav
    aria-label="Pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentPropsWithoutRef<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  href?: string;
  size?: "default" | "sm" | "lg";
} & React.ComponentPropsWithoutRef<"a">;

const PaginationLink = ({
  className,
  isActive,
  size = "default",
  href,
  ...props
}: {
  isActive?: boolean;
  href?: string;
  size?: "default" | "sm" | "lg";
} & React.ComponentPropsWithoutRef<"a">) => {
  const sizes = {
    default: "h-10 w-10",
    sm: "h-8 w-8",
    lg: "h-12 w-12",
  };
  return (
    <a
      href={href}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-md border bg-transparent text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        isActive && "bg-primary text-primary-foreground",
        className
      )}
      {...props}
    />
  );
};
PaginationLink.displayName = "PaginationLink";

const PaginationEllipsis = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden="true"
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <span className="text-ellipsis" aria-hidden="true">
      …
    </span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
};
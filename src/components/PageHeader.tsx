import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export type Crumb = { label: string; to?: string };

/**
 * Encabezado estándar de página: breadcrumb + título + acciones.
 * El último crumb es la página actual (sin link). Reemplaza a los botones "Volver".
 * En páginas de primer nivel (un solo crumb) el breadcrumb no se muestra.
 */
export const PageHeader = ({
  breadcrumbs,
  title,
  description,
  actions,
}: {
  breadcrumbs: Crumb[];
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) => (
  <div className="space-y-3">
    {/* Con un solo nivel el breadcrumb repetiría el título: solo se muestra en subpáginas */}
    {breadcrumbs.length > 1 && (
      <Breadcrumb>
        <BreadcrumbList className="gap-1.5 text-xs font-medium uppercase tracking-wider sm:gap-2">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem className="min-w-0">
                  {isLast || !crumb.to ? (
                    <BreadcrumbPage className="truncate font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild className="hover:text-primary">
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    )}

    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="text-sm text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>}
    </div>
  </div>
);

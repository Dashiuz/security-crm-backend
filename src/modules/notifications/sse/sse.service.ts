import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable, interval, merge } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SseEventPayload {
  type: string;
  targetUserId?: string;
  tenantId?: string;
  clientId?: string | null;
  data?: any;
  timestamp?: string;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly events$ = new Subject<SseEventPayload>();

  /**
   * Emite un evento SSE dirigido a un usuario específico
   */
  emitToUser(userId: string, data: { type: string; [key: string]: any }) {
    this.events$.next({
      ...data,
      targetUserId: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emite un evento SSE a todos los usuarios de un tenant (opcionalmente filtrado por cliente)
   */
  emitToTenant(
    tenantId: string,
    data: { type: string; [key: string]: any },
    clientId?: string,
  ) {
    this.events$.next({
      ...data,
      tenantId,
      clientId: clientId ?? null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Construye el flujo SSE reactivo para un usuario autenticado
   */
  getUserStream(
    userId: string,
    tenantId?: string,
    clientId?: string | null,
  ): Observable<MessageEvent> {
    const userEvents$ = this.events$.pipe(
      filter((event) => {
        // 1. Mensaje directo al usuario
        if (event.targetUserId && event.targetUserId === userId) {
          return true;
        }

        // 2. Mensaje dirigido al tenant
        if (event.tenantId && tenantId && event.tenantId === tenantId) {
          // Si el evento está restringido a un cliente específico:
          if (event.clientId && clientId && event.clientId !== clientId) {
            return false;
          }
          return true;
        }

        return false;
      }),
      map((event) => ({
        data: event,
      } as MessageEvent)),
    );

    // Heartbeat cada 30 segundos para evitar timeouts de proxy o navegadores
    const heartbeat$ = interval(30000).pipe(
      map(() => ({
        data: {
          type: 'HEARTBEAT',
          timestamp: new Date().toISOString(),
        },
      } as MessageEvent)),
    );

    return merge(userEvents$, heartbeat$);
  }
}

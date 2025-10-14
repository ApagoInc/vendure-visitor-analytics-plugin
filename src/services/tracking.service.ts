import { Injectable } from "@nestjs/common"
import {
    ChannelService,
    CustomerService,
    ID,
    Product,
    RequestContext,
    TransactionalConnection
} from "@vendure/core"

import { VisitorEvent } from "../entities/visitor-event.entity"
import { VisitorSession } from "../entities/visitor-session.entity"

export interface TrackProductViewInput {
    productId: ID
}

@Injectable()
export class TrackingService {
    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService,
        private customerService: CustomerService
    ) {}

    /**
     * Track a product view event from the storefront.
     * Handles session management, deduplication, and event recording.
     * Uses the session from RequestContext (Vendure's built-in session handling).
     */
    async trackProductView(
        ctx: RequestContext,
        input: TrackProductViewInput
    ): Promise<{ recorded: boolean; reason?: string }> {
        const { productId } = input

        const sessionToken = this.getSessionToken(ctx)
        const session = await this.findOrCreateSession(ctx, sessionToken)

        const eventKey = this.generateEventKey(productId)
        const isDuplicate = await this.isDuplicateEvent(
            ctx,
            session.id,
            eventKey
        )
        if (isDuplicate) {
            return { recorded: false, reason: "duplicate" }
        }

        const product = await this.connection
            .getRepository(ctx, Product)
            .findOne({ where: { id: productId } })

        if (!product) {
            return { recorded: false, reason: "product_not_found" }
        }

        const channels = await this.channelService.findAll(ctx)
        const activeChannel = channels.items.find(c => c.id === ctx.channelId)

        if (!activeChannel) {
            return { recorded: false, reason: "channel_not_found" }
        }

        const event = new VisitorEvent({
            type: "PRODUCT_VIEW",
            session,
            product,
            eventKey,
            channels: [activeChannel]
        })

        await this.connection.getRepository(ctx, VisitorEvent).save(event)

        session.lastSeen = new Date()
        await this.connection.getRepository(ctx, VisitorSession).save(session)

        return { recorded: true }
    }

    /**
     * Find existing visitor session by token, or create a new one.
     */
    private async findOrCreateSession(
        ctx: RequestContext,
        sessionToken: string
    ): Promise<VisitorSession> {
        const existingSession = await this.connection
            .getRepository(ctx, VisitorSession)
            .findOne({
                where: { sessionToken },
                relations: ["channels"]
            })

        if (existingSession) {
            if (ctx.activeUserId && !existingSession.customerId) {
                const customer = await this.customerService.findOneByUserId(
                    ctx,
                    ctx.activeUserId
                )

                existingSession.customer = customer
                await this.connection
                    .getRepository(ctx, VisitorSession)
                    .save(existingSession)
            }
            return existingSession
        }

        const channels = await this.channelService.findAll(ctx)
        const activeChannel = channels.items.find(c => c.id === ctx.channelId)

        const now = new Date()
        const newSession = new VisitorSession({
            sessionToken,
            firstSeen: now,
            lastSeen: now,
            channels: activeChannel ? [activeChannel] : [],
            customer: ctx.activeUserId
                ? await this.customerService.findOneByUserId(
                      ctx,
                      ctx.activeUserId
                  )
                : null
        })

        return this.connection
            .getRepository(ctx, VisitorSession)
            .save(newSession)
    }

    /**
     * Check if an event with this session + eventKey already exists.
     * Used for deduplication (one product view per session per product).
     */
    private async isDuplicateEvent(
        ctx: RequestContext,
        sessionId: ID,
        eventKey: string
    ): Promise<boolean> {
        const count = await this.connection
            .getRepository(ctx, VisitorEvent)
            .createQueryBuilder("event")
            .innerJoin("event.session", "session")
            .where("session.id = :sessionId", { sessionId })
            .andWhere("event.eventKey = :eventKey", { eventKey })
            .getCount()

        return count > 0
    }

    /**
     * Generate eventKey for deduplication.
     * Strategy: one view per product per session.
     */
    private generateEventKey(productId: ID): string {
        return `product-${productId}`
    }

    /**
     * Extract session token from RequestContext.
     * Vendure manages sessions automatically via the session middleware.
     */
    private getSessionToken(ctx: RequestContext): string {
        if (ctx.session?.token) {
            return ctx.session.token
        }

        // Fallback: generate one (shouldn't happen in normal shop API flow)
        const timestamp = Date.now()
        const random = Math.random().toString(36).substring(2, 11)
        return `anonymous-${timestamp}-${random}`
    }
}

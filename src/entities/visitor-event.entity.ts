import {
    Channel,
    type DeepPartial,
    Product,
    VendureEntity
} from "@vendure/core"
import { Column, Entity, Index, ManyToOne, RelationId } from "typeorm"

import { VisitorSession } from "./visitor-session.entity"

export type VisitorEventType = "PAGE_VIEW" | "PRODUCT_VIEW"

@Entity()
@Index(["channel", "createdAt"])
@Index(["session", "createdAt"])
@Index(["product", "createdAt"])
export class VisitorEvent extends VendureEntity {
    constructor(input?: DeepPartial<VisitorEvent>) {
        super(input)
    }

    @Column({ type: "varchar", length: 32 })
    type!: VisitorEventType

    @ManyToOne(() => VisitorSession, { nullable: false, onDelete: "CASCADE" })
    session!: VisitorSession
    @RelationId((e: VisitorEvent) => e.session)
    sessionId!: string | number

    @ManyToOne(() => Channel, { nullable: false, onDelete: "CASCADE" })
    channel!: Channel
    @RelationId((e: VisitorEvent) => e.channel)
    channelId!: string | number

    @Column({ type: "varchar", length: 1024 })
    path!: string

    @ManyToOne(() => Product, { nullable: true, onDelete: "SET NULL" })
    product?: Product
    @RelationId((e: VisitorEvent) => e.product)
    productId?: string | number

    @Column({ type: "varchar", length: 1024, nullable: true })
    referrer?: string

    @Column({ type: "boolean", default: false })
    isBot!: boolean

    @Column({ type: "varchar", length: 128, nullable: true, unique: false })
    eventKey?: string
}

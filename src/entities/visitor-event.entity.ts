import {
    Channel,
    ChannelAware,
    type DeepPartial,
    Product,
    VendureEntity
} from "@vendure/core"
import {
    Column,
    Entity,
    Index,
    JoinTable,
    ManyToMany,
    ManyToOne,
    RelationId
} from "typeorm"

import { VisitorSession } from "./visitor-session.entity"

export type VisitorEventType = "PRODUCT_VIEW"

@Entity()
@Index(["createdAt"])
@Index(["eventKey", "createdAt"])
@Index(["session", "createdAt"])
@Index(["session", "eventKey"])
@Index(["product", "createdAt"])
export class VisitorEvent extends VendureEntity implements ChannelAware {
    constructor(input?: DeepPartial<VisitorEvent>) {
        super(input)
    }

    @Column({ type: "varchar", length: 32 })
    type!: VisitorEventType

    @ManyToOne(() => VisitorSession, { nullable: false, onDelete: "CASCADE" })
    session!: VisitorSession
    @RelationId((e: VisitorEvent) => e.session)
    sessionId!: string | number

    @ManyToOne(() => Product, { nullable: true, onDelete: "SET NULL" })
    product?: Product
    @RelationId((e: VisitorEvent) => e.product)
    productId?: string | number

    @Column({ type: "varchar", length: 128, nullable: true, unique: false })
    eventKey?: string

    @ManyToMany(() => Channel)
    @JoinTable()
    channels: Channel[]
}

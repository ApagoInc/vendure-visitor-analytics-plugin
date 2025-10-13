import {
    Channel,
    Customer,
    type DeepPartial,
    Session,
    VendureEntity
} from "@vendure/core"
import { Column, Entity, Index, ManyToOne, RelationId } from "typeorm"

@Entity()
@Index(["createdAt"])
@Index(["channel", "lastSeen"])
@Index(["vendureSession"])
export class VisitorSession extends VendureEntity {
    constructor(input?: DeepPartial<VisitorSession>) {
        super(input)
    }

    @Column({ unique: true })
    sessionToken!: string

    @Column({ type: Date })
    firstSeen!: Date

    @Column({ type: Date })
    lastSeen!: Date

    @Column({ nullable: true })
    userAgent?: string

    @Column({ nullable: true, length: 2 })
    countryCode?: string

    @Column({ nullable: true, length: 64 })
    utmSource?: string

    @Column({ nullable: true, length: 64 })
    utmMedium?: string

    @Column({ nullable: true, length: 128 })
    utmCampaign?: string

    @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
    customer?: Customer
    @RelationId((s: VisitorSession) => s.customer)
    customerId?: string | number

    @ManyToOne(() => Channel, { nullable: false, onDelete: "CASCADE" })
    channel!: Channel
    @RelationId((s: VisitorSession) => s.channel)
    channelId!: string | number

    @ManyToOne(() => Session, { nullable: true, onDelete: "SET NULL" })
    vendureSession?: Session
    @RelationId((s: VisitorSession) => s.vendureSession)
    vendureSessionId?: string | number
}

import {
    Channel,
    ChannelAware,
    Customer,
    type DeepPartial,
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

@Entity()
@Index(["createdAt"])
export class VisitorSession extends VendureEntity implements ChannelAware {
    constructor(input?: DeepPartial<VisitorSession>) {
        super(input)
    }

    @Column({ unique: true })
    sessionToken!: string

    @Column({ type: Date })
    firstSeen!: Date

    @Column({ type: Date })
    lastSeen!: Date

    @ManyToOne(() => Customer, { nullable: true, onDelete: "SET NULL" })
    customer?: Customer | null
    @RelationId((s: VisitorSession) => s.customer)
    customerId?: string | number

    @ManyToMany(() => Channel)
    @JoinTable()
    channels: Channel[]
}

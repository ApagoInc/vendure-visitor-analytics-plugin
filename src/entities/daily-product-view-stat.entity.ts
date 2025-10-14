import {
    Channel,
    type DeepPartial,
    Product,
    VendureEntity
} from "@vendure/core"
import {
    Column,
    Entity,
    Index,
    ManyToOne,
    PrimaryColumn,
    RelationId
} from "typeorm"

@Entity()
@Index(["date"])
@Index(["product", "date"])
@Index(["date", "channel", "product"], { unique: true })
export class DailyProductViewStat extends VendureEntity {
    constructor(input?: DeepPartial<DailyProductViewStat>) {
        super(input)
    }

    @PrimaryColumn({ type: "date" }) date!: string

    @ManyToOne(() => Channel, { nullable: false, onDelete: "CASCADE" })
    channel!: Channel
    @RelationId((e: DailyProductViewStat) => e.channel)
    @PrimaryColumn()
    channelId!: string | number

    @ManyToOne(() => Product, { nullable: false, onDelete: "CASCADE" })
    product!: Product
    @RelationId((e: DailyProductViewStat) => e.product)
    @PrimaryColumn()
    productId!: string | number

    @Column({ type: "int", default: 0 }) views!: number
}

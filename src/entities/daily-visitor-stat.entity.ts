import { Channel, type DeepPartial, VendureEntity } from "@vendure/core"
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
@Index(["date", "channel"], { unique: true })
export class DailyVisitorStat extends VendureEntity {
    constructor(input?: DeepPartial<DailyVisitorStat>) {
        super(input)
    }

    @PrimaryColumn({ type: "date" }) date!: string

    @ManyToOne(() => Channel, { nullable: false, onDelete: "CASCADE" })
    channel!: Channel
    @RelationId((e: DailyVisitorStat) => e.channel)
    @PrimaryColumn()
    channelId!: string | number

    @Column({ type: "int", default: 0 }) uniqueVisitors!: number
}

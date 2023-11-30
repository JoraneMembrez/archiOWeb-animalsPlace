import mongoose from "mongoose";
const { Schema } = mongoose;
import sizeOf from "image-size";

const imageSchema = new Schema({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "Animal",
  },
  image: {
    data: Buffer,
    contentType: String,
  },
});

export default mongoose.model("Image", imageSchema);

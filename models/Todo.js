import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "할일 내용을 입력해주세요."],
      trim: true,
      maxlength: [500, "할일은 500자 이내로 입력해주세요."],
    },
    completed: {
      type: Boolean,
      default: false,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Todo", todoSchema);

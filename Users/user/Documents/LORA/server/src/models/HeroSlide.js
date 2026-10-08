import mongoose from "mongoose";

const heroSlideSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    subtitle: {
      type: String,
      default: "",
      trim: true
    },
    buttonText: {
      type: String,
      default: "Shop now",
      trim: true
    },
    buttonLink: {
      type: String,
      default: "/products",
      trim: true
    },
    image: {
      url: {
        type: String,
        required: true
      },
      publicId: {
        type: String,
        default: ""
      }
    },
    backgroundColor: {
      type: String,
      default: "#14532D"
    },
    textColor: {
      type: String,
      default: "#FFFFFF"
    },
    accentColor: {
      type: String,
      default: "#84CC16"
    },
    order: {
      type: Number,
      default: 0,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const HeroSlide = mongoose.model("HeroSlide", heroSlideSchema);
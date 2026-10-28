import { isValidObjectId } from "mongoose"

export function escapeRegex(text: string): string{
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function isObjectId(value: string): boolean{
    return /^[0-9a-fA-F]{24}$/.test(value) && isValidObjectId(value);
}
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColorItem } from "./color_item";

describe("<ColorItem />", () => {
    it("renders the label and formatted uppercase hex readout", () => {
        render(<ColorItem label="Core Color" rgb={[1, 0, 0]} onChange={vi.fn()} />);

        expect(screen.getByText("Core Color")).toBeInTheDocument();
        expect(screen.getByText("#FF0000")).toBeInTheDocument();
    });

    it("triggers onChange with normalized rgb triplet when input value changes", () => {
        const onChange = vi.fn();
        render(<ColorItem label="Core Color" rgb={[0, 0, 0]} onChange={onChange} />);

        const input = screen.getByLabelText("Core Color");
        fireEvent.change(input, { target: { value: "#00ff00" } });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith([0, 1, 0]);
    });
});

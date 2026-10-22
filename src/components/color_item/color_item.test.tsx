import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ColorItem } from "./color_item";

describe("<ColorItem />", () => {
    it("renders the label and formatted uppercase hex readout when given RgbLike color", () => {
        render(<ColorItem label="Core Color" color={{ r: 1, g: 0, b: 0 }} onChange={vi.fn()} />);

        expect(screen.getByText("Core Color")).toBeInTheDocument();
        expect(screen.getByText("#FF0000")).toBeInTheDocument();
    });

    it("renders formatted uppercase hex readout when given legacy rgb tuple or rgb object", () => {
        const { rerender } = render(<ColorItem label="Outer Arms" rgb={[0, 0, 1]} onChange={vi.fn()} />);
        expect(screen.getByText("#0000FF")).toBeInTheDocument();

        rerender(<ColorItem label="Outer Arms" rgb={{ r: 0, g: 1, b: 0 }} onChange={vi.fn()} />);
        expect(screen.getByText("#00FF00")).toBeInTheDocument();
    });

    it("triggers onChange with RgbLike object when input value changes", () => {
        const onChange = vi.fn();
        render(<ColorItem label="Core Color" color={{ r: 0, g: 0, b: 0 }} onChange={onChange} />);

        const input = screen.getByLabelText("Core Color");
        fireEvent.change(input, { target: { value: "#00ff00" } });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ r: 0, g: 1, b: 0 });
    });
});

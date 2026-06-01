import React from "react";

export interface IImageGalleryProps
    extends React.HTMLAttributes<HTMLUListElement> {
    imageUrls: string[];
}

export const ImageGallery = (
    props: IImageGalleryProps
) => {
    const { imageUrls, ...restOfProps } = props;

    return (
        <ul className={restOfProps?.className + " gallery"}>
            {imageUrls.map((url) => {
                return (
                    <li key={url}>
                        <img
                            src={url}
                        ></img>
                    </li>
                );
            })}
            <li>{/*left intentionally empty*/}</li>
        </ul>
    );
};

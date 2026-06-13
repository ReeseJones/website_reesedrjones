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
        <ul {...restOfProps} className="gallery">
            {imageUrls.map((url) => {
                return (
                    <li key={url}>
                        <img
                            src={url}
                            loading="lazy"
                        ></img>
                    </li>
                );
            })}
            <li>{/*left intentionally empty*/}</li>
        </ul>
    );
};

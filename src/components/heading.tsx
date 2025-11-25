import React from "react";

interface HeadingProps {
  title: string;
  description: string;
}

const Heading: React.FC<HeadingProps> = ({ title, description }) => {
  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight font-serif text-foreground">
        {title}
      </h2>
      <p className="text-muted-foreground mt-1">{description}</p>
    </div>
  );
};

export default Heading;
